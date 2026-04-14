create or replace function public.audit_table_change()
returns trigger
language plpgsql
as $$
declare
  actor_auth_user_id uuid;
  actor_app_user_id bigint;
  actor_email text;
  jwt_claims jsonb;
  request_headers jsonb;
  header_actor_auth_user_id uuid;
  header_actor_app_user_id bigint;
  header_actor_email text;
  header_actor_user_code text;
  header_actor_login_id text;
  record_id text;
begin
  begin
    actor_auth_user_id := auth.uid();
  exception
    when others then
      actor_auth_user_id := null;
  end;

  begin
    jwt_claims := nullif(current_setting('request.jwt.claims', true), '')::jsonb;
  exception
    when others then
      jwt_claims := null;
  end;

  begin
    request_headers := nullif(current_setting('request.headers', true), '')::jsonb;
  exception
    when others then
      request_headers := null;
  end;

  begin
    header_actor_auth_user_id := nullif(request_headers ->> 'x-app-auth-user-id', '')::uuid;
  exception
    when others then
      header_actor_auth_user_id := null;
  end;

  begin
    header_actor_app_user_id := nullif(request_headers ->> 'x-app-user-id', '')::bigint;
  exception
    when others then
      header_actor_app_user_id := null;
  end;

  header_actor_email := nullif(request_headers ->> 'x-app-user-email', '');
  header_actor_user_code := nullif(request_headers ->> 'x-app-user-code', '');
  header_actor_login_id := nullif(request_headers ->> 'x-app-user-login-id', '');

  actor_email := coalesce(
    header_actor_email,
    jwt_claims ->> 'email',
    nullif(current_setting('request.jwt.claim.email', true), ''),
    session_user
  );

  actor_auth_user_id := coalesce(actor_auth_user_id, header_actor_auth_user_id);
  actor_app_user_id := coalesce(actor_app_user_id, header_actor_app_user_id);

  if actor_app_user_id is null and (
    header_actor_user_code is not null
    or header_actor_login_id is not null
    or header_actor_email is not null
  ) then
    select
      u.id,
      u.auth_user_id,
      coalesce(header_actor_email, u.email)
    into
      actor_app_user_id,
      actor_auth_user_id,
      actor_email
    from public.app_users u
    where (header_actor_user_code is not null and u.user_code = header_actor_user_code)
       or (header_actor_login_id is not null and u.login_id = header_actor_login_id)
       or (header_actor_email is not null and lower(u.email) = lower(header_actor_email))
    order by u.id
    limit 1;
  end if;

  if actor_auth_user_id is not null then
    select u.id, coalesce(actor_email, u.email)
    into actor_app_user_id, actor_email
    from public.app_users u
    where u.auth_user_id = actor_auth_user_id
    limit 1;
  end if;

  if actor_auth_user_id is null and actor_app_user_id is not null then
    select u.auth_user_id, coalesce(actor_email, u.email)
    into actor_auth_user_id, actor_email
    from public.app_users u
    where u.id = actor_app_user_id
    limit 1;
  end if;

  if tg_op = 'DELETE' then
    record_id := coalesce(to_jsonb(old) ->> 'id', to_jsonb(old) ->> 'user_id');

    insert into public.system_change_log (
      schema_name,
      table_name,
      operation,
      record_id,
      changed_by_auth_user_id,
      changed_by_app_user_id,
      changed_by_email,
      old_data,
      new_data
    )
    values (
      tg_table_schema,
      tg_table_name,
      lower(tg_op),
      record_id,
      actor_auth_user_id,
      actor_app_user_id,
      actor_email,
      to_jsonb(old),
      null
    );

    return old;
  end if;

  record_id := coalesce(to_jsonb(new) ->> 'id', to_jsonb(new) ->> 'user_id', to_jsonb(old) ->> 'id');

  insert into public.system_change_log (
    schema_name,
    table_name,
    operation,
    record_id,
    changed_by_auth_user_id,
    changed_by_app_user_id,
    changed_by_email,
    old_data,
    new_data
  )
  values (
    tg_table_schema,
    tg_table_name,
    lower(tg_op),
    record_id,
    actor_auth_user_id,
    actor_app_user_id,
    actor_email,
    case when tg_op = 'UPDATE' then to_jsonb(old) else null end,
    to_jsonb(new)
  );

  return new;
end;
$$;