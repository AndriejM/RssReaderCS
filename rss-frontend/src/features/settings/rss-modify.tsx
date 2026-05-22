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
} from "@/shared/ui/kit/dialog.tsx";
import { v4 as uuidv4 } from 'uuid';
import useRssModifyStore from "@/shared/storage/rss-modify-store.ts";
import {useEffect} from "react";

function getRegexCheckExpression() {
  return /^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})$/
}

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  url: z.url({
    message: "Please enter a valid url.",
  }),
  refreshCronExpression: z.string().regex(getRegexCheckExpression(), {
    message: "Cron expression isn't valid.",
  }).optional().or(z.literal(''))
});

export const RssModify = () => {
  const { open, title, description, cancelLabel, actionLabel, onAction, closeRssModify, rssConfig } = useRssModifyStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: rssConfig?.name || "",
      url: rssConfig?.url || "",
      refreshCronExpression: rssConfig?.refreshCronExpression || ""
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    let uuid : string
    if (rssConfig) {
      uuid = rssConfig.uuid;
    } else {
      uuid = uuidv4();
    }
    onAction({uuid, name: values.name, url: values.url, refreshCronExpression: values.refreshCronExpression });
    form.reset();
    closeRssModify();
  }

  useEffect(() => {
    form.setValue("name", rssConfig?.name);
    form.setValue("url", rssConfig?.url);
    form.setValue("refreshCronExpression", rssConfig?.refreshCronExpression);
  }, [rssConfig]);

  return (
      <Dialog open={open} onOpenChange={closeRssModify}>
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
                          <Input placeholder="Rss name" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter rss name.
                        </FormDescription>
                        <FormMessage/>
                      </FormItem>
                  )}
              />

              <FormField
                  control={form.control}
                  name="url"
                  render={({field}) => (
                      <FormItem>
                        <FormLabel>Url</FormLabel>
                        <FormControl>
                          <Input placeholder="Rss url" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter rss url.
                        </FormDescription>
                        <FormMessage/>
                      </FormItem>
                  )}
              />

              <FormField
                  control={form.control}
                  name="refreshCronExpression"
                  render={({field}) => (
                      <FormItem>
                        <FormLabel>Cron expression</FormLabel>
                        <FormControl>
                          <Input placeholder="Refresh cron expression" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter refresh cron expression.
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