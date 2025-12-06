"use client"

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { type Incident } from "@/lib/data";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const formSchema = z.object({
  resourceId: z.string().nonempty("Debe seleccionar un recurso."),
});

type ResourceDispatchFormProps = {
    incident: Incident;
}

export function ResourceDispatchForm({ incident }: ResourceDispatchFormProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [availableResources, setAvailableResources] = useState<
      { id: string; name: string; type: string; status: string }[]
    >([]);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
      async function loadResources() {
        try {
          const response = await fetch("/api/resources");
          if (!response.ok) {
            throw new Error("No se pudieron cargar los recursos");
          }
          const data = await response.json();

          const resourcesFromAPI: { id: string; name: string; type: string; status: string }[] =
            data.resources || data.data || [];

          const filtered = resourcesFromAPI.filter(
            (r) => r.status === "Disponible" || r.id === incident.assignedResource
          );
          setAvailableResources(filtered);
        } catch (error) {
          console.error("Error cargando recursos:", error);
          toast({
            title: "Error",
            description:
              "No se pudieron cargar los recursos disponibles. Intente nuevamente.",
            variant: "destructive",
          });
        }
      }

      loadResources();
    }, [incident.assignedResource, toast]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            resourceId: incident.assignedResource || "",
        },
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
      setIsLoading(true);
      try {
        const response = await fetch(
          `/api/incidents/${incident.id}/assign-resource`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ resourceId: values.resourceId }),
          }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            data.error ||
              "No se pudo asignar el recurso. Verifique e intente nuevamente."
          );
        }

        const resource = availableResources.find(
          (r) => r.id === values.resourceId
        );

        toast({
          title: "Recurso Asignado",
          description: `Se ha asignado ${
            resource?.name ?? values.resourceId
          } al incidente.`,
        });
        router.push("/dashboard");
        router.refresh();
      } catch (error: any) {
        toast({
          title: "Error",
          description:
            error?.message ||
            "Ocurrió un problema al asignar el recurso. Intente nuevamente.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Seleccionar Recurso</CardTitle>
                <CardDescription>Elija una unidad disponible para atender este incidente.</CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                         <FormField
                            control={form.control}
                            name="resourceId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Recursos Disponibles</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccione un recurso" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {availableResources.map(resource => (
                                                <SelectItem key={resource.id} value={resource.id}>
                                                    {resource.name} - ({resource.type})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => router.back()} disabled={isLoading}>
                              Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading || availableResources.length === 0}>
                              {isLoading ? "Asignando..." : "Asignar Recurso"}
                            </Button>
                        </div>
                    </form>
                </Form>
            </CardContent>
        </Card>
    );
}
