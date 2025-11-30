drop table if exists event cascade;

create table event (
    id bigint primary key,
    start_date timestamptz not null,
    end_date timestamptz not null,
    name text not null,
    description text,
    category text
)
