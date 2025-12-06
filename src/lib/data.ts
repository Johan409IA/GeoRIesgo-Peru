export type IncidentStatus = "Activo" | "En Proceso" | "Cerrado";
export type ResourceStatus = "Disponible" | "Asignado";

export type Incident = {
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  descriptiveLocation: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  reportedBy: string;
  operatorNotes: string[];
  assignedResource?: string;
};

export type Resource = {
  id: string;
  name: string;
  type: string;
  status: ResourceStatus;
};

export const incidents: Incident[] = [
  {
    id: "INC-001",
    title: "Deslizamiento de tierra en Chosica",
    description: "Se ha reportado un deslizamiento de tierra de gran magnitud en la zona de Carapongo, afectando varias viviendas.",
    status: "Activo",
    descriptiveLocation: "Carapongo, Chosica, Lima",
    latitude: -11.9701,
    longitude: -76.8407,
    createdAt: "2024-07-20T10:30:00Z",
    reportedBy: "Ana García",
    operatorNotes: ["Contacto inicial realizado con el informante.", "Se requiere evaluación de daños urgente."],
  },
  {
    id: "INC-002",
    title: "Inundación en Iquitos",
    description: "El río Itaya se ha desbordado, causando inundaciones en el distrito de Belén.",
    status: "En Proceso",
    descriptiveLocation: "Belén, Iquitos, Loreto",
    latitude: -3.7644,
longitude: -73.2519,
    createdAt: "2024-07-19T15:00:00Z",
    reportedBy: "Carlos Vega",
    operatorNotes: ["Brigada de rescate enviada al lugar.", "Se coordina con la municipalidad para albergues temporales."],
    assignedResource: "RES-001",
  },
  {
    id: "INC-003",
    title: "Sismo leve en Arequipa",
    description: "Sismo de 4.5 grados registrado a 30km de la ciudad de Arequipa. No se reportan daños mayores por el momento.",
    status: "Cerrado",
    descriptiveLocation: "Arequipa, Arequipa",
    latitude: -16.3988,
    longitude: -71.535,
    createdAt: "2024-07-18T08:00:00Z",
    reportedBy: " INDECI",
    operatorNotes: ["Monitoreo finalizado.", "Sin daños a la infraestructura ni a la población."],
  },
    {
    id: "INC-004",
    title: "Incendio forestal en Cusco",
    description: "Incendio de rápida propagación cerca del Valle Sagrado.",
    status: "Activo",
    descriptiveLocation: "Valle Sagrado, Urubamba, Cusco",
    latitude: -13.3167,
    longitude: -72.1167,
    createdAt: "2024-07-21T11:00:00Z",
    reportedBy: "Guardaparques",
    operatorNotes: ["Se necesita apoyo aéreo.", "Evacuación de comunidades cercanas en progreso."],
  },
  {
    id: "INC-005",
    title: "Heladas en Puno",
    description: "Descenso drástico de temperaturas afectando cultivos y ganado en la región del altiplano.",
    status: "En Proceso",
    descriptiveLocation: "Juliaca, Puno",
    latitude: -15.4984,
    longitude: -70.1319,
    createdAt: "2024-07-20T22:00:00Z",
    reportedBy: "SENAMHI",
    operatorNotes: ["Distribución de frazadas y kits de abrigo iniciada."],
    assignedResource: "RES-002",
  },
];

export const resources: Resource[] = [
  { id: "RES-001", name: "Brigada 001", type: "Rescate acuático", status: "Asignado" },
  { id: "RES-002", name: "Equipo de Ayuda Humanitaria", type: "Logística y Suministros", status: "Asignado" },
  { id: "RES-003", name: "Unidad Médica Móvil", type: "Atención Sanitaria", status: "Disponible" },
  { id: "RES-004", name: "Bomberos Forestales Alfa", type: "Combate de Incendios", status: "Disponible" },
];
