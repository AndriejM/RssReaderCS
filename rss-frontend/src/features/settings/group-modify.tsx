import type {Group, RssConfig} from "@/shared/model/types.ts";
import {useEffect, useState} from "react";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from "@/shared/ui/kit/form.tsx";
import {Button} from "@/shared/ui/kit/button.tsx";
import * as z from "zod";
import {useForm} from "react-hook-form";
import {zodResolver} from "@hookform/resolvers/zod";
import {Input} from "@/shared/ui/kit/input.tsx";
import {
  Dialog,
  DialogClose,
  DialogContent, DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/shared/ui/kit/dialog.tsx";
import {Pencil, Trash} from "lucide-react";
import {v4 as uuidv4} from 'uuid';
import {Tooltip, TooltipContent, TooltipTrigger} from "@/shared/ui/kit/tooltip.tsx";
import useConfirmationStore from "@/shared/storage/confirmation-store.ts";
import useGroupModifyStore from "@/shared/storage/group-modify-store.ts";

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  })
});

export const GroupModify = () => {
  const { open, title, description, cancelLabel, actionLabel, onAction, closeGroupModify, group } = useGroupModifyStore();


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: group?.name || ""
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    let uuid: string, rssConfigs: RssConfig[]
    if (group) {
      uuid = group.uuid;
      rssConfigs = group.rssConfigs;
    } else {
      uuid = uuidv4();
      rssConfigs = [];
    }
    onAction({
      uuid,
      name: values.name,
      rssConfigs: rssConfigs
    });
    form.reset();
    closeGroupModify();
  }

  useEffect(() => {
    form.setValue("name", group?.name)
  }, [group]);

  return (
      <Dialog open={open} onOpenChange={closeGroupModify}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </DialogHeader>

              <FormField
                  control={form.control}
                  name="name"
                  render={({field}) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Group name" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter group name.
                        </FormDescription>
                        <FormMessage/>
                      </FormItem>
                  )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline">{cancelLabel}</Button>
                </DialogClose>
                <Button type="submit">{actionLabel}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
  )
}