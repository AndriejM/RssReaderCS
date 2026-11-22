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
import {type Resolver, useForm} from "react-hook-form";
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
import type {AppConfig} from "@/shared/model/types.ts";
import {useI18n} from "@/shared/i18n/use-i18n.ts";

function makeFormSchema(t: (key: string) => string) {
  return z.object({
    daysForCleanRssItems: z
    .coerce
    .number(t("appconfig.cleanWhole"))
    .positive(t("appconfig.cleanPositive"))
    .min(2, {
      message: t("appconfig.cleanGreater"),
    }).max(10, {
      message: t("appconfig.cleanLess")
    }),
    daysForSetRead: z
    .coerce
    .number(t("appconfig.setReadWhole"))
    .positive(t("appconfig.setReadPositive"))
    .min(2, {
      message: t("appconfig.setReadGreater"),
    }).max(10, {
      message: t("appconfig.setReadLess")
    }),
    isSetClickedRssToRead: z.boolean()
  }).refine(schema => {
        return (schema.daysForSetRead < schema.daysForCleanRssItems)
      }, {message: t("appconfig.setReadLessThanClean"), path: ["daysForSetRead"]}
  );
}

export const AppConfigModify = () => {
  const { open, title, description, cancelLabel, actionLabel, onAction, closeAppConfigModify, appConfig } = useAppConfigModifyStore();
  const { t } = useI18n();

  const formSchema = useMemo(() => makeFormSchema(t), [t]);

  type AppConfigFormValues = z.output<typeof formSchema>;

  const form = useForm<AppConfigFormValues>({
    resolver: zodResolver(formSchema) as Resolver<AppConfigFormValues, unknown, AppConfigFormValues>,
    defaultValues: {
      daysForCleanRssItems: appConfig?.appConfigPayload?.daysForCleanRssItems ?? 4,
      daysForSetRead: appConfig?.appConfigPayload?.daysForSetRead ?? 1,
      isSetClickedRssToRead: appConfig?.appConfigPayload?.isSetClickedRssToRead ?? true,
    },
  });

  function onSubmit(values: AppConfigFormValues) {
    console.log(values);
    const payload = appConfig?.appConfigPayload;
    const newAppConfig: AppConfig = {
      id: appConfig?.id ?? 0,
      appConfigPayload: {
        defaultUserId: payload?.defaultUserId ?? 0,
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
    form.reset({
      daysForCleanRssItems: appConfig?.appConfigPayload?.daysForCleanRssItems ?? 4,
      daysForSetRead: appConfig?.appConfigPayload?.daysForSetRead ?? 1,
      isSetClickedRssToRead: appConfig?.appConfigPayload?.isSetClickedRssToRead ?? true,
    });
  }, [appConfig, form]);

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
                          {t("appconfig.enterCleanDays")}
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
                          {t("appconfig.enterSetReadDays")}
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
                          {t("appconfig.setClickedDesc")}
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