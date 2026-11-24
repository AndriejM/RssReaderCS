import {useState} from "react";
import {toast} from "sonner";
import {Pencil, Trash} from "lucide-react";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Input} from "@/shared/ui/kit/input.tsx";
import {Label} from "@/shared/ui/kit/label.tsx";
import {Badge} from "@/shared/ui/kit/badge.tsx";
import {Card, CardContent, CardHeader, CardTitle} from "@/shared/ui/kit/card";
import {
  Dialog, DialogClose,
  DialogContent, DialogDescription, DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/kit/dialog.tsx";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/kit/table";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/shared/ui/kit/tooltip.tsx";
import {useUserStore, useUserStoreAsync} from "@/shared/storage/user-store.ts";
import {useAppConfigStoreAsync} from "@/shared/storage/app-config-store.ts";
import useConfirmationStore from "@/shared/storage/confirmation-store.ts";
import {UserCreator} from "@/shared/ui/components/user/user-creator.tsx";
import {useI18n} from "@/shared/i18n/use-i18n.ts";
import type {User} from "@/shared/model/types.ts";

export function ProfilesSettings() {
  const {t} = useI18n();
  const users = useUserStoreAsync((state) => state.getUser);
  const appConfig = useAppConfigStoreAsync((state) => state.appConfig);
  const updateUser = useUserStore((state) => state.updateUser.trigger);
  const deleteUser = useUserStore((state) => state.deleteUser.trigger);
  const {openConfirmation} = useConfirmationStore();

  const [editing, setEditing] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const currentUserId = appConfig?.appConfigPayload?.defaultUserId;

  function openEdit(user: User) {
    setEditing(user);
    setName(user.userName);
  }

  async function submitEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editing) {
      return;
    }
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      toast.error(t("form.nameMin2"));
      return;
    }
    setSaving(true);
    try {
      await updateUser({id: editing.id, userName: trimmed});
      toast.success(t("profile.updated"));
      setEditing(null);
    } catch {
      toast.error(t("profile.updateError"));
    } finally {
      setSaving(false);
    }
  }

  function deleteHandler(user: User) {
    openConfirmation({
      title: t("profile.deleteTitle"),
      description: t("profile.deleteDesc", {name: user.userName}),
      cancelLabel: t("common.cancel"),
      actionLabel: t("common.delete"),
      onAction: async () => {
        try {
          await deleteUser(user.id);
          toast.success(t("profile.deleted"));
        } catch {
          toast.error(t("profile.deleteError"));
        }
      },
      onCancel: () => {
      },
    });
  }

  return (
      <div className="flex justify-center pt-5" data-testid="profiles-settings">
        <Card className="w-3/4">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t("settings.profiles.title")}</CardTitle>
            <UserCreator/>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("common.name")}</TableHead>
                  <TableHead className="text-right">{t("group.action")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => {
                  const isCurrent = user.id === currentUserId;
                  return (
                      <TableRow key={user.id}>
                        <TableCell>
                          {user.userName}
                          {isCurrent && (
                              <Badge variant="secondary" className="ml-2">{t("profile.current")}</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" aria-label={t("profile.modify")}
                                      onClick={() => openEdit(user)}>
                                <Pencil/>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t("profile.modify")}</p>
                            </TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="outline" size="icon" aria-label={t("profile.remove")}
                                      disabled={isCurrent}
                                      onClick={() => deleteHandler(user)}>
                                <Trash/>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{isCurrent ? t("profile.cannotDeleteCurrent") : t("profile.remove")}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) { setEditing(null); } }}>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={submitEdit}>
              <DialogHeader>
                <DialogTitle>{t("profile.modify")}</DialogTitle>
                <DialogDescription>{t("profile.modifyDesc")}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="profile-name-form">{t("common.name")}</Label>
                  <Input
                      id="profile-name-form"
                      name="name"
                      required
                      value={name}
                      onChange={(evt) => { setName(evt.target.value); }}
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    {t("common.cancel")}
                  </Button>
                </DialogClose>
                <Button type="submit" disabled={saving}>{t("common.modify")}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  );
}
