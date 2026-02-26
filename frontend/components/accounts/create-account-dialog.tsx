"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@apollo/client/react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CREATE_ACCOUNT } from "@/lib/graphql/mutations";
import { GET_ACCOUNTS } from "@/lib/graphql/queries";
import type { CreateAccountMutationResult } from "@/types/graphql";

const schema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(64, "Name too long")
    .regex(/^[a-zA-Z0-9_\- ]+$/, "Only letters, numbers, spaces, hyphens and underscores"),
});

type FormValues = z.infer<typeof schema>;

interface CreateAccountDialogProps {
  onCreated?: () => void;
}

export function CreateAccountDialog({ onCreated }: CreateAccountDialogProps) {
  const [open, setOpen] = useState(false);

  const [createAccount, { loading }] = useMutation<CreateAccountMutationResult>(CREATE_ACCOUNT, {
    refetchQueries: [GET_ACCOUNTS],
    onCompleted: (data) => {
      if (data?.createAccount) {
        toast.success(`Account "${data.createAccount.name}" created`);
        setOpen(false);
        form.reset();
        onCreated?.();
      }
    },
    onError: (err) => {
      toast.error(err.message ?? "Failed to create account");
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "" },
  });

  const onSubmit = (values: FormValues) => {
    void createAccount({ variables: { name: values.name.trim() } });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          New Account
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Account</DialogTitle>
          <DialogDescription>
            Add a new account to the system. Account names must be unique.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g. Jane Smith"
                      autoComplete="off"
                      disabled={loading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
