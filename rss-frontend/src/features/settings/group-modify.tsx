import type {RssConfig} from "@/shared/model/types.ts";
import {useEffect, useMemo} from "react";
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
  DialogTitle
} from "@/shared/ui/kit/dialog.tsx";
import {v4 as uuidv4} from 'uuid';
import useGroupModifyStore from "@/shared/storage/group-modify-store.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";

function makeFormSchema(t: (key: string) => string) {
  return z.object({
    name: z.string().min(2, {
      message: t("form.nameMin2"),
    })
  });
}

export const GroupModify = () => {
  const { open, title, description, cancelLabel, actionLabel, onAction, closeGroupModify, group } = useGroupModifyStore();
  const { t } = useI18n();

  const formSchema = useMemo(() => makeFormSchema(t), [t]);

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
    form.reset({ name: group?.name ?? "" });
  }, [group, form]);

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
                        <FormLabel>{t("form.name")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("form.nameGroupPlaceholder")} {...field} />
                        </FormControl>
                        <FormDescription>
                          {t("form.enterGroupName")}
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