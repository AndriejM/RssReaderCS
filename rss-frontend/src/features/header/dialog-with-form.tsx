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


export default function DialogWithForm() {
  const [open, setOpen] = useState(false)
  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    // Handle form submission
    console.log("Form submitted")
    setOpen(false)
  }
  return (
      <div className="w-full p-6 flex justify-center">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Open Form Dialog</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Edit profile</DialogTitle>
                <DialogDescription>
                  Make changes to your profile here. Click save when you're done.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name-form">Name</Label>
                  <Input
                      id="name-form"
                      name="name"
                      defaultValue="Pedro Duarte"
                      required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="username-form">Username</Label>
                  <Input
                      id="username-form"
                      name="username"
                      defaultValue="@peduarte"
                      required
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
  )
}