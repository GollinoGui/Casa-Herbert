import { randomUUID } from "node:crypto";
import { addDays, format } from "date-fns";
import { DEFAULT_SETTINGS_SEED } from "@/lib/booking/constants";
import type {
  Appointment,
  BlockedSlot,
  BusinessHourRule,
  Customer,
  GalleryItem,
  Service,
  Settings,
  SpecialHours,
  Testimonial,
} from "@/types";

export interface MockDatabase {
  services: Service[];
  customers: Customer[];
  appointments: Appointment[];
  businessHours: BusinessHourRule[];
  specialHours: SpecialHours[];
  blockedSlots: BlockedSlot[];
  settings: Settings;
  testimonials: Testimonial[];
  gallery: GalleryItem[];
}

function d(offsetDays: number) {
  return format(addDays(new Date(), offsetDays), "yyyy-MM-dd");
}

function now() {
  return new Date().toISOString();
}

function makeService(
  name: string,
  slug: string,
  description: string,
  durationMinutes: number,
  displayOrder: number
): Service {
  return {
    id: randomUUID(),
    name,
    slug,
    description,
    durationMinutes,
    priceCents: null,
    isActive: true,
    displayOrder,
    createdAt: now(),
    updatedAt: now(),
  };
}

export function buildSeedData(): MockDatabase {
  const services: Service[] = [
    makeService(
      "Avaliação Capilar",
      "avaliacao-capilar",
      "Conversa e observação individual do couro cabeludo e dos fios para entender a necessidade de cada pessoa antes de qualquer protocolo.",
      30,
      1
    ),
    makeService(
      "Tricoscopia",
      "tricoscopia",
      "Exame de observação capilar com equipamento próprio, usado para acompanhar a saúde do couro cabeludo ao longo do cuidado.",
      30,
      2
    ),
    makeService(
      "Terapia Capilar",
      "terapia-capilar",
      "Protocolo personalizado de cuidado para o couro cabeludo, pensado a partir da avaliação individual de cada cliente.",
      60,
      3
    ),
    makeService(
      "Fotobiomodulação",
      "fotobiomodulacao",
      "Sessão de luz de baixa intensidade voltada ao acompanhamento da saúde capilar e do bem-estar do couro cabeludo.",
      45,
      4
    ),
    makeService(
      "Velaterapia",
      "velaterapia",
      "Técnica de cuidado e finalização dos fios, indicada dentro do protocolo individual de cada cliente.",
      60,
      5
    ),
    makeService(
      "Corte Feminino",
      "corte-feminino",
      "Corte personalizado, sempre alinhado ao momento de saúde capilar de cada cliente.",
      60,
      6
    ),
    makeService(
      "Corte Masculino",
      "corte-masculino",
      "Corte masculino com atenção aos cuidados do couro cabeludo.",
      30,
      7
    ),
  ];

  const businessHours: BusinessHourRule[] = [];
  for (const weekday of [2, 3, 4, 5, 6]) {
    businessHours.push(
      { id: randomUUID(), weekday, startTime: "09:00", endTime: "11:00", isActive: true },
      { id: randomUUID(), weekday, startTime: "14:00", endTime: "19:00", isActive: true }
    );
  }

  const specialHours: SpecialHours[] = [
    {
      id: randomUUID(),
      date: `${new Date().getFullYear()}-12-24`,
      isClosed: false,
      reason: "Véspera de Natal — horário reduzido",
      ranges: [{ startTime: "09:00", endTime: "13:00" }],
    },
    {
      id: randomUUID(),
      date: `${new Date().getFullYear()}-12-25`,
      isClosed: true,
      reason: "Natal",
      ranges: [],
    },
  ];

  const customers: Customer[] = [
    {
      id: randomUUID(),
      fullName: "Marina Souza",
      phone: "16991230011",
      normalizedPhone: "16991230011",
      email: "marina.souza@example.com",
      notes: null,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: randomUUID(),
      fullName: "Carla Ferreira",
      phone: "16991230022",
      normalizedPhone: "16991230022",
      email: null,
      notes: "Prefere atendimento no início da tarde.",
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: randomUUID(),
      fullName: "Beatriz Lima",
      phone: "16991230033",
      normalizedPhone: "16991230033",
      email: "bia.lima@example.com",
      notes: null,
      createdAt: now(),
      updatedAt: now(),
    },
    {
      id: randomUUID(),
      fullName: "Rafael Nunes",
      phone: "16991230044",
      normalizedPhone: "16991230044",
      email: null,
      notes: null,
      createdAt: now(),
      updatedAt: now(),
    },
  ];

  const appointments: Appointment[] = [
    {
      id: randomUUID(),
      customerId: customers[0].id,
      serviceId: services[0].id,
      date: d(2),
      startTime: "09:00",
      endTime: "09:30",
      status: "PENDING",
      customerNotes: "Primeira vez, gostaria de entender melhor o protocolo.",
      adminNotes: null,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: null,
      cancelledAt: null,
    },
    {
      id: randomUUID(),
      customerId: customers[1].id,
      serviceId: services[2].id,
      date: d(3),
      startTime: "14:00",
      endTime: "15:00",
      status: "CONFIRMED",
      customerNotes: null,
      adminNotes: "Cliente já conhece o protocolo.",
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: now(),
      cancelledAt: null,
    },
    {
      id: randomUUID(),
      customerId: customers[2].id,
      serviceId: services[5].id,
      date: d(4),
      startTime: "15:00",
      endTime: "16:00",
      status: "PENDING",
      customerNotes: null,
      adminNotes: null,
      createdAt: now(),
      updatedAt: now(),
      confirmedAt: null,
      cancelledAt: null,
    },
    {
      id: randomUUID(),
      customerId: customers[3].id,
      serviceId: services[6].id,
      date: d(-5),
      startTime: "09:30",
      endTime: "10:00",
      status: "COMPLETED",
      customerNotes: null,
      adminNotes: null,
      createdAt: d(-6),
      updatedAt: d(-5),
      confirmedAt: d(-6),
      cancelledAt: null,
    },
    {
      id: randomUUID(),
      customerId: customers[0].id,
      serviceId: services[3].id,
      date: d(-2),
      startTime: "16:00",
      endTime: "16:45",
      status: "REJECTED",
      customerNotes: null,
      adminNotes: "Horário conflitante, cliente reagendará.",
      createdAt: d(-3),
      updatedAt: d(-2),
      confirmedAt: null,
      cancelledAt: d(-2),
    },
  ];

  const blockedSlots: BlockedSlot[] = [
    {
      id: randomUUID(),
      startDate: d(7),
      endDate: d(7),
      isFullDay: false,
      startTime: "09:00",
      endTime: "11:00",
      reason: "training",
      notes: "Curso de atualização em tricologia.",
      createdAt: now(),
    },
  ];

  const testimonials: Testimonial[] = [
    {
      id: randomUUID(),
      customerName: "Marina S.",
      rating: 5,
      content:
        "Me senti realmente ouvida. A avaliação foi individual, sem pressa, e o protocolo fez toda diferença no meu couro cabeludo.",
      isPublished: true,
      displayOrder: 1,
      createdAt: now(),
    },
    {
      id: randomUUID(),
      customerName: "Beatriz L.",
      rating: 5,
      content:
        "Ambiente acolhedor e cuidado de verdade. Recomendo a fotobiomodulação para quem busca acompanhamento contínuo.",
      isPublished: true,
      displayOrder: 2,
      createdAt: now(),
    },
    {
      id: randomUUID(),
      customerName: "Carla F.",
      rating: 5,
      content: "Profissionalismo do início ao fim. Cada visita começa com uma conversa sobre como estou.",
      isPublished: true,
      displayOrder: 3,
      createdAt: now(),
    },
  ];

  const gallery: GalleryItem[] = [
    { id: randomUUID(), caption: "Acompanhamento capilar — 8 semanas", category: "resultados", isPublished: true, displayOrder: 1, createdAt: now() },
    { id: randomUUID(), caption: "Protocolo de fortalecimento", category: "resultados", isPublished: true, displayOrder: 2, createdAt: now() },
    { id: randomUUID(), caption: "Sessão de fotobiomodulação", category: "espaco", isPublished: true, displayOrder: 3, createdAt: now() },
    { id: randomUUID(), caption: "Ambiente Casa Herbert", category: "espaco", isPublished: true, displayOrder: 4, createdAt: now() },
    { id: randomUUID(), caption: "Cuidado do couro cabeludo", category: "resultados", isPublished: true, displayOrder: 5, createdAt: now() },
    { id: randomUUID(), caption: "Velaterapia", category: "espaco", isPublished: true, displayOrder: 6, createdAt: now() },
  ];

  const settings: Settings = { ...DEFAULT_SETTINGS_SEED, messageTemplates: { ...DEFAULT_SETTINGS_SEED.messageTemplates } };

  return {
    services,
    customers,
    appointments,
    businessHours,
    specialHours,
    blockedSlots,
    settings,
    testimonials,
    gallery,
  };
}
