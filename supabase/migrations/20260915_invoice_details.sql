alter table public.invoices
    add column if not exists invoice_number text,
    add column if not exists rate numeric(12, 2),
    add column if not exists quantity numeric(12, 2) not null default 1,
    add column if not exists payment_method text,
    add column if not exists upi_id text,
    add column if not exists paid_on date;

update public.invoices
set rate = amount,
    quantity = 1
where rate is null;

create unique index if not exists invoices_invoice_number_key
    on public.invoices (invoice_number)
    where invoice_number is not null;

alter table public.invoices
    add constraint invoices_payment_method_check
    check (payment_method is null or payment_method in ('upi', 'cash', 'card'));
