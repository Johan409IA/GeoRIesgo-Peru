"use client";

import {
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarContent,
} from "@/components/ui/sidebar";
import { LayoutDashboard, PlusCircle, ShieldAlert, Truck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/incidents/new", label: "Nuevo Incidente", icon: PlusCircle },
  { href: "/resources", label: "Recursos", icon: Truck },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <>
      <SidebarHeader className="bg-gradient-to-r from-primary to-primary/80 border-b border-border p-4">
        <div className="flex items-center gap-3">
          <div className="bg-background text-primary p-2.5 rounded-xl shadow-lg">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg text-primary-foreground">
              GeoRiesgo
            </span>
            <span className="text-xs text-primary-foreground/80">Perú</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-background p-4 space-y-2">
        <SidebarMenu className="space-y-1">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (pathname.startsWith(item.href) && item.href !== "/dashboard");

            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  className={`
                    rounded-lg transition-all duration-200 px-4 py-3
                    ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-lg"
                        : "text-foreground hover:bg-muted"
                    }
                  `}
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    <item.icon className="h-5 w-5" />
                    <span className="font-medium text-sm">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>
    </>
  );
}
