"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Home } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const formSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres."),
  type: z.string().min(3, "El tipo de recurso es requerido."),
  status: z.enum(["Disponible", "Asignado"]),
});

interface Resource {
  id: string;
  name: string;
  type: string;
  status: string;
}

export default function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [resourceId, setResourceId] = useState<string>("");

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "",
      status: "Disponible",
    },
  });

  useEffect(() => {
    async function loadResource() {
      try {
        const resolvedParams = await params;
        setResourceId(resolvedParams.id);

        const response = await fetch("/api/resources", {
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("No se pudo cargar el recurso");
        }

        const data = await response.json();
        const resources: Resource[] = data.resources || data.data || [];
        const resource = resources.find(
          (r: Resource) => r.id === resolvedParams.id
        );

        if (!resource) {
          toast({
            title: "Error",
            description: "Recurso no encontrado",
            variant: "destructive",
          });
          router.push("/resources");
          return;
        }

        form.reset({
          name: resource.name,
          type: resource.type,
          status: resource.status as "Disponible" | "Asignado",
        });
      } catch {
        toast({
          title: "Error",
          description: "No se pudo cargar el recurso",
          variant: "destructive",
        });
        router.push("/resources");
      } finally {
        setIsFetching(false);
      }
    }

    loadResource();
  }, [params, form, router, toast]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/resources/${resourceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description:
            data.error || "Ocurrió un error al actualizar el recurso",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Recurso Actualizado",
        description: `El recurso "${values.name}" ha sido actualizado correctamente.`,
      });
      router.push("/resources");
      router.refresh();
    } catch {
      toast({
        title: "Error",
        description: "Ocurrió un error al actualizar el recurso",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (isFetching) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-96" />
          </div>
        </div>
        <Card className="shadow-lg">
          <CardContent className="pt-6 space-y-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="shadow-md hover:shadow-lg transition-shadow"
        >
          <Link href="/dashboard">
            <Home className="h-4 w-4" />
            <span className="sr-only">Volver al Dashboard</span>
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Editar Recurso</h1>
          <p className="text-muted-foreground">
            Modifica la información del recurso en el sistema.
          </p>
        </div>
      </div>

      <Card className="shadow-lg">
        <CardContent className="pt-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del Recurso</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Brigada de Rescate Bravo"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Identificador único para el recurso.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Recurso</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej: Combate de Incendios"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Especialidad o capacidad del recurso.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Disponible">Disponible</SelectItem>
                        <SelectItem value="Asignado">Asignado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/resources")}
                  disabled={isLoading}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="shadow-md hover:shadow-lg transition-shadow"
                >
                  {isLoading ? "Actualizando..." : "Actualizar Recurso"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
