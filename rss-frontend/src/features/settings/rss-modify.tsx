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
import type {RssConfig} from "@/shared/model/types.ts";

function getRegexCheckExpression() {
  return /^((((\d+,)+\d+|(\d+(\/|-|#)\d+)|\d+L?|\*(\/\d+)?|L(-\d+)?|\?|[A-Z]{3}(-[A-Z]{3})?) ?){5,7})$/
}

const optionalPositiveInt = z.union([
  z.literal(""),
  z.string().regex(/^\d+$/).refine((value) => Number(value) > 0, {
    message: "Must be greater than 0.",
  }),
]).optional();

function toOptionalInt(value?: string) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }
  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
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
  }).optional().or(z.literal('')),
  refreshMinutes: optionalPositiveInt,
  cleanMinutes: optionalPositiveInt,
});

export const RssModify = () => {
  const { open, title, description, cancelLabel, actionLabel, onAction, closeRssModify, rssConfig } = useRssModifyStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: rssConfig?.name || "",
      url: rssConfig?.url || "",
      refreshCronExpression: rssConfig?.refreshCronExpression || "",
      refreshMinutes: rssConfig?.refreshMinutes?.toString() ?? "",
      cleanMinutes: rssConfig?.cleanMinutes?.toString() ?? "",
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
    const updated: RssConfig = {
      ...(rssConfig ?? {uuid}),
      uuid,
      name: values.name,
      url: values.url,
      refreshCronExpression: values.refreshCronExpression ?? "",
      refreshMinutes: toOptionalInt(values.refreshMinutes),
      cleanMinutes: toOptionalInt(values.cleanMinutes),
    };
    onAction(updated);
    form.reset();
    closeRssModify();
  }

  useEffect(() => {
    form.reset({
      name: rssConfig?.name ?? "",
      url: rssConfig?.url ?? "",
      refreshCronExpression: rssConfig?.refreshCronExpression ?? "",
      refreshMinutes: rssConfig?.refreshMinutes?.toString() ?? "",
      cleanMinutes: rssConfig?.cleanMinutes?.toString() ?? "",
    });
  }, [rssConfig, form]);

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

              <FormField
                  control={form.control}
                  name="refreshMinutes"
                  render={({field}) => (
                      <FormItem>
                        <FormLabel>Refresh minutes</FormLabel>
                        <FormControl>
                          <Input
                              type="number"
                              min={1}
                              step={1}
                              placeholder="Refresh every N minutes"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional interval-based refresh override.
                        </FormDescription>
                        <FormMessage/>
                      </FormItem>
                  )}
              />

              <FormField
                  control={form.control}
                  name="cleanMinutes"
                  render={({field}) => (
                      <FormItem>
                        <FormLabel>Clean minutes</FormLabel>
                        <FormControl>
                          <Input
                              type="number"
                              min={1}
                              step={1}
                              placeholder="Clean after N minutes"
                              value={field.value ?? ""}
                              onChange={field.onChange}
                              onBlur={field.onBlur}
                              name={field.name}
                              ref={field.ref}
                          />
                        </FormControl>
                        <FormDescription>
                          Optional per-feed cleanup override.
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
  );
}
