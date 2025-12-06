"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import type { Incident } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  title: z.string().min(5, "El título debe tener al menos 5 caracteres."),
  description: z
    .string()
    .min(10, "La descripción debe tener al menos 10 caracteres."),
  status: z.enum(["Activo", "En Proceso", "Cerrado"]),
  reportedBy: z.string().min(3, "El nombre del reportante es requerido."),
  descriptiveLocation: z.string().min(5, "La ubicación es requerida."),
  latitude: z.coerce
    .number()
    .min(-90, "La latitud debe estar entre -90 y 90.")
    .max(90, "La latitud debe estar entre -90 y 90."),
  longitude: z.coerce
    .number()
    .min(-180, "La longitud debe estar entre -180 y 180.")
    .max(180, "La longitud debe estar entre -180 y 180."),
});

type IncidentFormProps = {
  incident?: Incident;
};

// Mapear status del formulario al formato de la API
function mapStatusToAPI(status: "Activo" | "En Proceso" | "Cerrado"): string {
  const statusMap: Record<string, string> = {
    Activo: "open",
    "En Proceso": "in_progress",
    Cerrado: "closed",
  };
  return statusMap[status] || "open";
}

export function IncidentForm({ incident }: IncidentFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ fullName: string } | null>(
    null
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: incident
      ? {
          ...incident,
        }
      : {
          title: "",
          description: "",
          status: "Activo",
          reportedBy: "",
          descriptiveLocation: "",
          latitude: -12.0464,
          longitude: -77.0428,
        },
  });

  // Obtener usuario actual al cargar el componente
  useEffect(() => {
    async function fetchCurrentUser() {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const data = await response.json();
          setCurrentUser(data.user);
          // Establecer el nombre del usuario automáticamente si no es edición
          if (!incident && data.user) {
            form.setValue("reportedBy", data.user.fullName);
          }
        }
      } catch (error) {
        console.error("Error fetching current user:", error);
      }
    }
    fetchCurrentUser();
  }, [incident, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      // Mapear datos al formato de la API
      const apiData = {
        title: values.title,
        description: values.description,
        status: mapStatusToAPI(values.status),
        reportedBy: values.reportedBy,
        descriptiveLocation: values.descriptiveLocation,
        latitud: values.latitude,
        longitud: values.longitude,
      };

      const url = incident ? `/api/incidents/${incident.id}` : "/api/incidents";
      const method = incident ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(apiData),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Ocurrió un error al guardar el incidente",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: `Incidente ${incident ? "actualizado" : "creado"}`,
        description: `El incidente "${values.title}" ha sido guardado.`,
      });
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Ocurrió un error al guardar el incidente",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título del Incidente</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Deslizamiento de tierra en Chosica"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reportedBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reportado Por</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Juan Pérez"
                      {...field}
                      disabled={!incident}
                      readOnly={!incident}
                    />
                  </FormControl>
                  <FormDescription>
                    {incident
                      ? "Nombre de la persona o entidad que reporta."
                      : "Se usará tu nombre automáticamente."}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={4}
                      placeholder="Describa el incidente en detalle..."
                      {...field}
                    />
                  </FormControl>
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
                      <SelectItem value="Activo">Activo</SelectItem>
                      <SelectItem value="En Proceso">En Proceso</SelectItem>
                      <SelectItem value="Cerrado">Cerrado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="descriptiveLocation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación Descriptiva</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: Carapongo, Chosica, Lima"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Una dirección o referencia del lugar del incidente.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <FormField
                control={form.control}
                name="latitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Latitud</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-12.0464"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="longitude"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Longitud</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="any"
                        placeholder="-77.0428"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Guardando..." : incident ? "Actualizar" : "Crear"}{" "}
                Incidente
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
