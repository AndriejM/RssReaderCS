import {useEffect} from "react";
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
import {Switch} from "@/shared/ui/kit/switch.tsx";
import useAppConfigModifyStore from "@/shared/storage/appConfig-modify-store.ts";

const formSchema = z.object({
  daysForCleanRssItems: z
  .coerce
  .number("daysForCleanRssItems must be a whole number")
  .positive("daysForCleanRssItems must be positive")
  .min(2, {
    message: "daysForCleanRssItems must be greater than 2.",
  }).max(10, {
    message: "daysForCleanRssItems must be less than 10."
  }),
  daysForSetRead: z
  .coerce
  .number("daysForSetRead must be a whole number")
  .positive("daysForSetRead must be positive")
  .min(2, {
    message: "daysForSetRead must be greater than 2.",
  }).max(10, {
    message: "daysForSetRead must be less than 10."
  }),
  isSetClickedRssToRead: z.boolean()
}).refine(schema => {
      return (schema.daysForSetRead < schema.daysForCleanRssItems)
    }, {message: "daysForSetRead must be less than daysForCleanRssItems.", path: ["daysForSetRead"]}
);

export const AppConfigModify = () => {
  const { open, title, description, cancelLabel, actionLabel, onAction, closeAppConfigModify, appConfig } = useAppConfigModifyStore();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      daysForCleanRssItems: appConfig?.appConfigPayload?.daysForCleanRssItems || 4,
      daysForSetRead: appConfig?.appConfigPayload?.daysForSetRead || 1,
      isSetClickedRssToRead: appConfig?.appConfigPayload?.isSetClickedRssToRead || true,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values);
    const newAppConfig = {
      ...appConfig,
      appConfigPayload: {
        ...appConfig?.appConfigPayload,
        daysForCleanRssItems: values.daysForCleanRssItems,
        daysForSetRead: values.daysForSetRead,
        isSetClickedRssToRead: values.isSetClickedRssToRead,
      }
    };
    onAction(newAppConfig);
    form.reset();
    closeAppConfigModify();
  }

  useEffect(() => {
    form.setValue("daysForCleanRssItems", appConfig?.appConfigPayload?.daysForCleanRssItems);
    form.setValue("daysForSetRead", appConfig?.appConfigPayload?.daysForSetRead);
    form.setValue("isSetClickedRssToRead", appConfig?.appConfigPayload?.isSetClickedRssToRead);
  }, [appConfig]);

  return (
      <Dialog open={open} onOpenChange={closeAppConfigModify}>
        <DialogContent className="sm:max-w-[425px]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <DialogHeader>
                <DialogTitle>{title}</DialogTitle>
                <DialogDescription>{description}</DialogDescription>
              </DialogHeader>

              <FormField
                  control={form.control}
                  name="daysForCleanRssItems"
                  render={({field}) => (
                      <FormItem>
                        <FormLabel>daysForCleanRssItems</FormLabel>
                        <FormControl>
                          <Input placeholder="daysForCleanRssItems" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter daysForCleanRssItems.
                        </FormDescription>
                        <FormMessage/>
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="daysForSetRead"
                  render={({field}) => (
                      <FormItem>
                        <FormLabel>daysForSetRead</FormLabel>
                        <FormControl>
                          <Input placeholder="daysForSetRead" {...field} />
                        </FormControl>
                        <FormDescription>
                          Enter daysForSetRead.
                        </FormDescription>
                        <FormMessage/>
                      </FormItem>
                  )}
              />
              <FormField
                  control={form.control}
                  name="isSetClickedRssToRead"
                  render={({field, fieldState}) => (
                      <FormItem>
                        <FormLabel>isSetClickedRssToRead</FormLabel>
                        <FormControl>
                          <Switch
                              id="isSetClickedRssToRead"
                              name={field.name}
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              aria-invalid={fieldState.invalid}
                          />
                        </FormControl>
                        <FormDescription>
                          Set isSetClickedRssToRead.
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