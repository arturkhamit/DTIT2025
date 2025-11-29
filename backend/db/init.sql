drop table if exists event cascade;

create table event (
    id bigint primary key,
    start_date timestamptz not null,
    end_date timestamptz not null,
    event_name text not null,
    description text,
    color text
)
