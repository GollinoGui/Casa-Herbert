import { canonicalPhone } from "@/lib/utils/phone";
import { addDaysToDateStr, todayDateStr, weekdayOf } from "@/lib/utils/date-format";
import { PAYABLE_CATEGORIES } from "@/lib/finance/constants";

/**
 * Dados de exemplo do modo demonstração, com datas relativas a hoje. Nomes e
 * telefones são fictícios. As vendas pagas já entram no livro-caixa, do mesmo
 * jeito que as RPCs fariam, para saldo e relatórios baterem.
 */

export type Row = Record<string, any>;
export type Tables = Record<string, Row[]>;

// Gerador determinístico: os mesmos dados a cada reinício.
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

let idCounter = 0;
function id(prefix: string) {
  idCounter += 1;
  const n = idCounter.toString(16).padStart(12, "0");
  return `${prefix.padEnd(8, "0").slice(0, 8)}-0000-4000-8000-${n}`;
}

function ts(date: string, time = "12:00") {
  return `${date}T${time}:00-03:00`;
}

const OPEN_WEEKDAYS = [2, 3, 4, 5, 6];
const SLOTS = ["09:00", "10:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

function plusMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function buildSeed(): Tables {
  idCounter = 0;
  const rand = rng(42);
  const pick = <T,>(list: T[]) => list[Math.floor(rand() * list.length)];
  const today = todayDateStr();
  const now = new Date().toISOString();

  const settings: Row = {
    id: 1,
    min_advance_days: 1,
    buffer_minutes: 0,
    slot_step_minutes: 15,
    pending_expiry_hours: 48,
    default_duration_minutes: 60,
    whatsapp_number: "5516991479968",
    salon_address: "Avenida Onze, nº 668, Orlândia - SP, CEP 14620-000",
    salon_timezone: "America/Sao_Paulo",
    message_templates: {
      confirmed:
        "Olá, {nome}! Tudo bem?\n\nSeu agendamento na Casa Herbert foi confirmado. 🌿\n\nServiço: {servico}\nData: {data}\nHorário: {horario}\n\nCasa Herbert — Embelezamento e Saúde Capilar\nOrlândia/SP",
      rejected:
        "Olá, {nome}. Recebemos sua solicitação de agendamento para {data} às {horario}.\n\nInfelizmente esse horário não poderá ser confirmado.\n\nEntre em contato conosco para escolhermos outro horário disponível. 🌿\n\nCasa Herbert — Embelezamento e Saúde Capilar",
      cancelled:
        "Olá, {nome}. Seu agendamento na Casa Herbert para {data} às {horario} foi cancelado.\n\nEntre em contato conosco para reagendar quando for melhor para você. 🌿\n\nCasa Herbert — Embelezamento e Saúde Capilar",
    },
    instagram_url: null,
    facebook_url: null,
    announcement_text: null,
    announcement_link: null,
    announcement_until: null,
    panel_preferences: {},
    payment_method_options: {},
    updated_at: now,
  };

  const business_hours: Row[] = OPEN_WEEKDAYS.flatMap((weekday) => [
    { id: id("bh"), weekday, start_time: "09:00:00", end_time: "11:00:00", is_active: true },
    { id: id("bh"), weekday, start_time: "14:00:00", end_time: "19:00:00", is_active: true },
  ]);

  // Retorno sugerido (dias) por serviço, na mesma ordem de serviceDefs.
  const returnDays = [null, 90, 15, 7, 30, 45, 30];
  const serviceDefs: [string, string, number, number, string][] = [
    ["Avaliação Capilar", "avaliacao-capilar", 30, 12000, "Conversa e observação individual do couro cabeludo e dos fios para entender a necessidade de cada pessoa antes de qualquer protocolo."],
    ["Tricoscopia", "tricoscopia", 30, 15000, "Exame de observação capilar com equipamento próprio, usado para acompanhar a saúde do couro cabeludo ao longo do cuidado."],
    ["Terapia Capilar", "terapia-capilar", 60, 22000, "Protocolo personalizado de cuidado para o couro cabeludo, pensado a partir da avaliação individual de cada cliente."],
    ["Fotobiomodulação", "fotobiomodulacao", 45, 18000, "Sessão de luz de baixa intensidade voltada ao acompanhamento da saúde capilar e do bem-estar do couro cabeludo."],
    ["Velaterapia", "velaterapia", 60, 9000, "Técnica de cuidado e finalização dos fios, indicada dentro do protocolo individual de cada cliente."],
    ["Corte Feminino", "corte-feminino", 60, 9000, "Corte personalizado, sempre alinhado ao momento de saúde capilar de cada cliente."],
    ["Corte Masculino", "corte-masculino", 30, 6000, "Corte masculino com atenção aos cuidados do couro cabeludo."],
  ];
  const services: Row[] = serviceDefs.map(([name, slug, duration, price, description], i) => ({
    id: id("svc"),
    name,
    slug,
    description,
    duration_minutes: duration,
    price_cents: price,
    is_active: true,
    display_order: i + 1,
    image_id: null,
    image_position: null,
    show_on_home: true,
    barcode: null,
    return_days: returnDays[i],
    created_at: now,
    updated_at: now,
  }));

  const customerDefs: [string, string][] = [
    ["Ana Paula Ribeiro", "(16) 99101-2201"],
    ["Bruno Carvalho", "(16) 99102-3302"],
    ["Camila Ferreira", "(16) 99103-4403"],
    ["Daniela Souza", "(16) 99104-5504"],
    ["Eduardo Lima", "(16) 99105-6605"],
    ["Fernanda Alves", "(16) 99106-7706"],
    ["Gabriela Martins", "(16) 99107-8807"],
    ["Helena Costa", "(16) 99108-9908"],
    ["Igor Pereira", "(16) 99109-1009"],
    ["Juliana Rocha", "(16) 99110-2110"],
    ["Larissa Mendes", "(16) 99111-3211"],
    ["Marcos Oliveira", "(16) 99112-4312"],
  ];
  // Três aniversários na semana, para o bloco do Início ter o que mostrar (o 3º sem ano).
  const birthdayIn = (days: number, year: number) => `${year}${addDaysToDateStr(today, days).slice(4)}`;
  const birthDates: Record<number, string> = { 0: birthdayIn(0, 1988), 3: birthdayIn(2, 1995), 6: birthdayIn(5, 1900) };
  const customers: Row[] = customerDefs.map(([full_name, phone], i) => ({
    id: id("cus"),
    full_name,
    phone,
    normalized_phone: canonicalPhone(phone),
    email: null,
    notes: null,
    birth_date: birthDates[i] ?? null,
    photo_consent_at: null,
    created_at: ts(addDaysToDateStr(today, -90)),
    updated_at: now,
  }));

  const professionals: Row[] = [{ id: id("pro"), name: "Herbert", is_active: true, created_at: now }];
  const admin_profiles: Row[] = [{ id: "demo-admin", full_name: "Herbert (demonstração)", role: "admin", created_at: now }];

  const productDefs: [string, number, number, number][] = [
    ["Shampoo Equilíbrio 300ml", 8900, 4200, 14],
    ["Condicionador Nutrição 300ml", 9400, 4500, 9],
    ["Tônico Fortalecedor 120ml", 12800, 6100, 6],
    ["Máscara Reconstrução 250g", 11500, 5200, 4],
    ["Óleo Finalizador 60ml", 7600, 3300, 11],
    ["Esfoliante para Couro Cabeludo", 9900, 4700, 2],
  ];
  const minStocks = [5, 5, 4, 5, null, 3];
  const products: Row[] = productDefs.map(([name, price, cost, stock], i) => ({
    id: id("prd"),
    name,
    price_cents: price,
    cost_cents: cost,
    stock_quantity: stock,
    min_stock: minStocks[i],
    is_active: true,
    barcode: `78900000000${String(i + 1).padStart(2, "0")}`,
    description: null,
    image_id: null,
    image_position: null,
    show_on_site: i < 3,
    created_at: now,
    updated_at: now,
  }));

  const appointments: Row[] = [];
  const sales: Row[] = [];
  const sale_items: Row[] = [];
  const cash_entries: Row[] = [];
  const methods = ["pix", "pix", "pix", "dinheiro", "cartao_credito", "cartao_debito"];

  cash_entries.push({
    id: id("cash"),
    entry_date: addDaysToDateStr(today, -70),
    direction: "in",
    amount_cents: 350000,
    category: "ajuste",
    description: "Saldo inicial do caixa",
    payment_method: null,
    sale_id: null,
    payable_id: null,
    customer_id: null,
    receipt_txid: null,
    reversal_of: null,
    created_at: ts(addDaysToDateStr(today, -70), "08:00"),
  });

  function addSale(opts: {
    date: string;
    customer: Row | null;
    appointmentId: string | null;
    items: { type: "service" | "product"; ref: Row; qty: number }[];
    open?: boolean;
  }) {
    const saleId = id("sale");
    let total = 0;
    for (const item of opts.items) {
      const unit = item.ref.price_cents;
      total += unit * item.qty;
      sale_items.push({
        id: id("item"),
        sale_id: saleId,
        item_type: item.type,
        ref_id: item.ref.id,
        description: item.ref.name,
        unit_price_cents: unit,
        quantity: item.qty,
        total_cents: unit * item.qty,
      });
    }
    const method = pick(methods);
    sales.push({
      id: saleId,
      appointment_id: opts.appointmentId,
      customer_id: opts.customer?.id ?? null,
      total_cents: total,
      payment_method: opts.open ? null : method,
      notes: null,
      created_at: ts(opts.date, "16:00"),
      status: opts.open ? "open" : "paid",
      discount_cents: 0,
      paid_cents: opts.open ? 0 : total,
      sale_date: opts.date,
      due_date: opts.open ? addDaysToDateStr(opts.date, 15) : null,
      paid_at: opts.open ? null : ts(opts.date, "16:00"),
      cancelled_at: null,
    });
    if (!opts.open) {
      cash_entries.push({
        id: id("cash"),
        entry_date: opts.date,
        direction: "in",
        amount_cents: total,
        category: "venda",
        description: "Venda",
        payment_method: method,
        sale_id: saleId,
        payable_id: null,
        customer_id: opts.customer?.id ?? null,
        receipt_txid: null,
        reversal_of: null,
        created_at: ts(opts.date, "16:00"),
      });
    }
  }

  // As duas últimas fichas só vieram uma vez, há meses: aparecem em "não voltam há um tempo".
  const regulars = customers.slice(0, -2);
  customers.slice(-2).forEach((customer, i) => {
    const date = addDaysToDateStr(today, i === 0 ? -75 : -96);
    const service = services[0];
    appointments.push({
      id: id("appt"),
      customer_id: customer.id,
      service_id: service.id,
      appointment_date: date,
      start_time: "10:00:00",
      end_time: `${plusMinutes("10:00", service.duration_minutes)}:00`,
      status: "COMPLETED",
      customer_notes: null,
      admin_notes: null,
      professional_id: professionals[0].id,
      discount_cents: 0,
      created_at: ts(addDaysToDateStr(date, -5)),
      updated_at: ts(addDaysToDateStr(date, -5)),
      confirmed_at: ts(addDaysToDateStr(date, -4)),
      cancelled_at: null,
    });
  });

  for (let offset = -60; offset <= 21; offset++) {
    const date = addDaysToDateStr(today, offset);
    if (!OPEN_WEEKDAYS.includes(weekdayOf(date))) continue;
    const perDay = offset < 0 ? 2 + Math.floor(rand() * 3) : offset === 0 ? 4 : Math.floor(rand() * 3);
    const daySlots = [...SLOTS].sort(() => rand() - 0.5).slice(0, perDay).sort();
    for (const start of daySlots) {
      const service = pick(services);
      const customer = pick(regulars);
      const end = plusMinutes(start, service.duration_minutes);
      const status =
        offset < 0
          ? rand() < 0.1 ? "CANCELLED" : "COMPLETED"
          : offset === 0
            ? "CONFIRMED"
            : rand() < 0.35 ? "PENDING" : "CONFIRMED";
      const apptId = id("appt");
      appointments.push({
        id: apptId,
        customer_id: customer.id,
        service_id: service.id,
        appointment_date: date,
        start_time: `${start}:00`,
        end_time: `${end}:00`,
        status,
        customer_notes: null,
        admin_notes: null,
        professional_id: professionals[0].id,
        discount_cents: 0,
        created_at: ts(addDaysToDateStr(date, -5)),
        updated_at: ts(addDaysToDateStr(date, -5)),
        confirmed_at: status === "PENDING" ? null : ts(addDaysToDateStr(date, -4)),
        cancelled_at: status === "CANCELLED" ? ts(addDaysToDateStr(date, -1)) : null,
      });
      if (status === "COMPLETED") {
        const items: { type: "service" | "product"; ref: Row; qty: number }[] = [{ type: "service", ref: service, qty: 1 }];
        if (rand() < 0.3) items.push({ type: "product", ref: pick(products), qty: 1 });
        addSale({ date, customer, appointmentId: apptId, items, open: offset > -12 && rand() < 0.12 });
      }
    }
  }
  for (let i = 0; i < 6; i++) {
    const date = addDaysToDateStr(today, -Math.floor(rand() * 50));
    addSale({ date, customer: rand() < 0.5 ? pick(customers) : null, appointmentId: null, items: [{ type: "product", ref: pick(products), qty: 1 + Math.floor(rand() * 2) }] });
  }

  const payable_categories: Row[] = PAYABLE_CATEGORIES.map((c, i) => ({
    slug: c.value,
    label: c.label,
    active: true,
    sort_order: (i + 1) * 10,
    created_at: now,
  }));

  const billDefs: [string, string, number, number][] = [
    ["Aluguel do salão", "aluguel", 180000, 5],
    ["Luz", "energia", 42000, 12],
    ["Água", "agua", 9800, 15],
    ["Internet e telefone", "internet", 14990, 20],
  ];
  const recurring_bills: Row[] = billDefs.map(([description, category, amount, dueDay]) => ({
    id: id("bill"),
    description,
    category,
    supplier: null,
    amount_cents: amount,
    due_day: dueDay,
    is_active: true,
    starts_on: addDaysToDateStr(today, -90),
    created_at: now,
    updated_at: now,
  }));

  // Contas fixas dos dois meses anteriores, já pagas e com a saída no caixa.
  const payables: Row[] = [];
  const thisMonth = `${today.slice(0, 7)}-01`;
  for (const monthsBack of [2, 1]) {
    let month = thisMonth;
    for (let k = 0; k < monthsBack; k++) month = `${addDaysToDateStr(month, -1).slice(0, 7)}-01`;
    for (const bill of recurring_bills) {
      const due = `${month.slice(0, 7)}-${String(bill.due_day).padStart(2, "0")}`;
      const payableId = id("pay");
      const method = pick(["pix", "pix", "dinheiro"]);
      payables.push({
        id: payableId,
        description: bill.description,
        category: bill.category,
        supplier: null,
        amount_cents: bill.amount_cents,
        due_date: due,
        status: "paid",
        paid_on: due,
        payment_method: method,
        recurring_bill_id: bill.id,
        competence: month,
        purchase_id: null,
        notes: null,
        created_at: ts(month),
        updated_at: ts(due),
      });
      cash_entries.push({
        id: id("cash"),
        entry_date: due,
        direction: "out",
        amount_cents: bill.amount_cents,
        category: "conta",
        description: bill.description,
        payment_method: method,
        sale_id: null,
        payable_id: payableId,
        customer_id: null,
        receipt_txid: null,
        reversal_of: null,
        created_at: ts(due, "10:00"),
      });
    }
  }
  payables.push({
    id: id("pay"),
    description: "Manutenção da cadeira de lavatório",
    category: "manutencao",
    supplier: "Assistência Orlândia",
    amount_cents: 26000,
    due_date: addDaysToDateStr(today, -3),
    status: "open",
    paid_on: null,
    payment_method: null,
    recurring_bill_id: null,
    competence: null,
    purchase_id: null,
    notes: null,
    created_at: ts(addDaysToDateStr(today, -10)),
    updated_at: ts(addDaysToDateStr(today, -10)),
  });

  const purchaseId = id("pur");
  const purchases: Row[] = [
    { id: purchaseId, supplier: "Distribuidora Capilar SP", purchase_date: addDaysToDateStr(today, -20), total_cents: 63000, notes: null, created_at: ts(addDaysToDateStr(today, -20)) },
  ];
  const purchase_items: Row[] = [
    { id: id("pit"), purchase_id: purchaseId, product_id: products[0].id, description: products[0].name, quantity: 10, unit_cost_cents: 4200, total_cents: 42000 },
    { id: id("pit"), purchase_id: purchaseId, product_id: products[4].id, description: products[4].name, quantity: 5, unit_cost_cents: 4200, total_cents: 21000 },
  ];
  const purchasePayableId = id("pay");
  payables.push({
    id: purchasePayableId,
    description: "Compra — Distribuidora Capilar SP",
    category: "compra",
    supplier: "Distribuidora Capilar SP",
    amount_cents: 63000,
    due_date: addDaysToDateStr(today, -20),
    status: "paid",
    paid_on: addDaysToDateStr(today, -20),
    payment_method: "pix",
    recurring_bill_id: null,
    competence: null,
    purchase_id: purchaseId,
    notes: null,
    created_at: ts(addDaysToDateStr(today, -20)),
    updated_at: ts(addDaysToDateStr(today, -20)),
  });
  cash_entries.push({
    id: id("cash"),
    entry_date: addDaysToDateStr(today, -20),
    direction: "out",
    amount_cents: 63000,
    category: "compra",
    description: "Compra — Distribuidora Capilar SP",
    payment_method: "pix",
    sale_id: null,
    payable_id: purchasePayableId,
    customer_id: null,
    receipt_txid: null,
    reversal_of: null,
    created_at: ts(addDaysToDateStr(today, -20), "11:00"),
  });

  const testimonials: Row[] = [
    ["Camila F.", 5, "Atendimento cuidadoso do começo ao fim. Saí entendendo o que meu couro cabeludo precisava."],
    ["Bruno C.", 5, "Ambiente tranquilo e um acompanhamento que faz diferença de verdade."],
    ["Helena C.", 4, "Gostei muito do protocolo personalizado. Recomendo a avaliação."],
  ].map(([customer_name, rating, content], i) => ({
    id: id("tst"),
    customer_name,
    rating,
    content,
    is_published: true,
    display_order: i + 1,
    created_at: now,
  }));

  // Próximo dia de funcionamento depois de duas semanas: fechado (feriado de exemplo).
  let holiday = addDaysToDateStr(today, 14);
  while (!OPEN_WEEKDAYS.includes(weekdayOf(holiday))) holiday = addDaysToDateStr(holiday, 1);
  const special_hours: Row[] = [{ id: id("sph"), special_date: holiday, is_closed: true, reason: "Feriado (exemplo)", created_at: now }];

  // Pacote de exemplo: vendido há 10 dias para a primeira cliente, nenhuma sessão usada ainda.
  const therapy = services.find((sv) => sv.slug === "terapia-capilar")!;
  const service_packages: Row[] = [
    { id: id("spk"), name: "Protocolo Terapia Capilar", service_id: therapy.id, sessions: 6, price_cents: 110000, valid_days: 180, is_active: true, created_at: now },
    { id: id("spk"), name: "Fotobiomodulação 10 sessões", service_id: services.find((sv) => sv.slug === "fotobiomodulacao")!.id, sessions: 10, price_cents: 150000, valid_days: null, is_active: true, created_at: now },
  ];
  const packageSaleDate = addDaysToDateStr(today, -10);
  const packageSaleId = id("sale");
  const packageBuyer = customers[0];
  sales.push({
    id: packageSaleId, appointment_id: null, customer_id: packageBuyer.id, total_cents: 110000, payment_method: "pix", notes: null,
    created_at: ts(packageSaleDate, "11:00"), status: "paid", discount_cents: 0, paid_cents: 110000, sale_date: packageSaleDate,
    due_date: null, paid_at: ts(packageSaleDate, "11:00"), cancelled_at: null,
  });
  sale_items.push({
    id: id("item"), sale_id: packageSaleId, item_type: "service", ref_id: null, description: "Pacote: Protocolo Terapia Capilar (6 sessões)",
    unit_price_cents: 110000, quantity: 1, total_cents: 110000,
  });
  cash_entries.push({
    id: id("cash"), entry_date: packageSaleDate, direction: "in", amount_cents: 110000, category: "venda",
    description: "Pacote: Protocolo Terapia Capilar (6 sessões)", payment_method: "pix", sale_id: packageSaleId, payable_id: null,
    customer_id: packageBuyer.id, receipt_txid: null, reversal_of: null, created_at: ts(packageSaleDate, "11:00"),
  });
  const customer_packages: Row[] = [
    {
      id: id("cpk"), customer_id: packageBuyer.id, service_id: therapy.id, package_id: service_packages[0].id, name: "Protocolo Terapia Capilar",
      sessions_total: 6, session_value_cents: 18333, sale_id: packageSaleId, status: "active",
      expires_on: addDaysToDateStr(packageSaleDate, 180), created_at: ts(packageSaleDate, "11:00"),
    },
  ];

  // Um atendimento confirmado da compradora, para o demo ter onde usar uma sessão.
  const nextSession = appointments.find((ap) => ap.appointment_date > today && ap.status === "CONFIRMED");
  if (nextSession) {
    nextSession.customer_id = packageBuyer.id;
    nextSession.service_id = therapy.id;
    nextSession.end_time = `${plusMinutes(nextSession.start_time.slice(0, 5), therapy.duration_minutes)}:00`;
  }

  // Dia aberto (e fora do feriado de exemplo) para a lista de espera mostrar vaga no demo.
  let waitDate = addDaysToDateStr(today, 2);
  while (!OPEN_WEEKDAYS.includes(weekdayOf(waitDate)) || waitDate === holiday) waitDate = addDaysToDateStr(waitDate, 1);
  const waitlist: Row[] = [
    {
      id: id("wl"), customer_id: customers[4].id, service_id: services[5].id, desired_date: waitDate, period: "afternoon",
      notes: "Prefere depois das 16h", status: "waiting", created_at: ts(addDaysToDateStr(today, -2)), updated_at: ts(addDaysToDateStr(today, -2)),
    },
  ];

  const customer_records: Row[] = [
    {
      id: id("rec"), customer_id: packageBuyer.id, record_date: packageSaleDate, appointment_id: null,
      notes: "Início do protocolo. Combinado acompanhamento a cada 15 dias e reavaliação na 3ª sessão.", created_at: ts(packageSaleDate, "11:10"),
    },
  ];

  return {
    settings: [settings],
    business_hours,
    services,
    customers,
    professionals,
    brands: [],
    commission_rules: [],
    admin_profiles,
    products,
    appointments: appointments.filter(
      (a) => !(a.appointment_date === holiday && (a.status === "PENDING" || a.status === "CONFIRMED"))
    ),
    appointment_products: [],
    service_products: [],
    sales,
    sale_items,
    cash_entries,
    payable_categories,
    recurring_bills,
    payables,
    purchases,
    purchase_items,
    testimonials,
    service_packages,
    customer_packages,
    cash_closings: [],
    waitlist,
    customer_records,
    customer_record_photos: [],
    gallery: [],
    media: [],
    site_image_slots: [],
    special_hours,
    special_hours_ranges: [],
    blocked_slots: [],
  };
}
