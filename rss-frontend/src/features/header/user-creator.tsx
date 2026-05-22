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

export const UserCreator = () => {
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
          <Button variant="outline">New profile</Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create profile</DialogTitle>
              <DialogDescription>
                Create new your profile here. Click create when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name-form">Name</Label>
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
                  Cancel
                </Button>
              </DialogClose>
              <Button type="submit">Create profile</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  );
}