import {
  Dialog, DialogClose,
  DialogContent, DialogDescription, DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/shared/ui/kit/dialog.tsx";
import {Button} from "@/shared/ui/kit/button.tsx";
import {Label} from "@/shared/ui/kit/label.tsx";
import {Input} from "@/shared/ui/kit/input.tsx";
import {Tooltip, TooltipContent, TooltipTrigger} from "@/shared/ui/kit/tooltip.tsx";
import {UserPlus} from "lucide-react";
import {useState} from "react";
import {toast} from "sonner";
import {useUserStore, useUserStoreAsync} from "@/shared/storage/user-store.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";

export const UserCreator = () => {
  const {t} = useI18n();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const createUser = useUserStore((state) => state.createUser.trigger);
  const user = useUserStoreAsync((state) => state.getUser);

  const calculateNextUserId = () => {
    return user.length > 0 ? Math.max(...user.map(o => o.id)) + 1 : 1;
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = inputValue.trim();
    if (trimmed.length < 2) {
      toast.error(t("form.nameMin2"));
      return;
    }
    setSubmitting(true);
    try {
      await createUser({
        id: calculateNextUserId(),
        userName: trimmed
      });
      toast.success(t("profile.created"));
      setInputValue('');
      setOpen(false);
    } catch {
      toast.error(t("profile.createError"));
    } finally {
      setSubmitting(false);
    }
  }
  return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DialogTrigger asChild>
              <Button variant="outline" size="icon" aria-label={t("profile.new")}>
                <UserPlus/>
              </Button>
            </DialogTrigger>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t("profile.new")}</p>
          </TooltipContent>
        </Tooltip>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>{t("profile.create")}</DialogTitle>
              <DialogDescription>
                {t("profile.createDesc")}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name-form">{t("common.name")}</Label>
                <Input
                    id="name-form"
                    name="name"
                    required
                    value={inputValue}
                    onChange={(evt) => { setInputValue(evt.target.value); }}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  {t("common.cancel")}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={submitting}>{t("profile.create")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}
