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
import {useState} from "react";
import {useUserStore, useUserStoreAsync} from "@/shared/storage/user-store.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";

export const UserCreator = () => {
  const {t} = useI18n();
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const createUser = useUserStore((state) => state.createUser.trigger);
  const user = useUserStoreAsync((state) => state.getUser);

  const calculateNextUserId = () => {
    return Math.max(...user.map(o => o.id)) + 1;
  }

  const handleSubmit = (event: React.FormEvent) => {
    setOpen(false);
    event.preventDefault();
    const newUser = {
      id: calculateNextUserId(),
      userName: inputValue
    }
    console.log("Form submitted user:" + JSON.stringify(newUser));
    createUser(newUser);
  }
  return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">{t("profile.new")}</Button>
        </DialogTrigger>
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
              <Button type="submit">{t("profile.create")}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}