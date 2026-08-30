#!/bin/sh
set -eu

DATA_DIR="${HASHIE_POSTGRES_DATA_DIR:-.local-postgres}"
PORT="${HASHIE_POSTGRES_PORT:-5433}"
DB_NAME="${HASHIE_POSTGRES_DB:-hashie}"
DB_USER="${HASHIE_POSTGRES_USER:-hashie}"
LOG_FILE="$DATA_DIR/server.log"

case "${1:-}" in
  start)
    if [ ! -f "$DATA_DIR/PG_VERSION" ]; then
      mkdir -p "$DATA_DIR"
      initdb -D "$DATA_DIR" -U "$DB_USER" --auth=trust >/dev/null
    fi

    if pg_ctl -D "$DATA_DIR" status >/dev/null 2>&1; then
      echo "PostgreSQL is already running on port $PORT."
    else
      pg_ctl -D "$DATA_DIR" -o "-p $PORT" -l "$LOG_FILE" start >/dev/null
      echo "PostgreSQL started on port $PORT."
    fi

    until pg_isready -h 127.0.0.1 -p "$PORT" -U "$DB_USER" >/dev/null 2>&1; do
      sleep 1
    done

    if ! psql -h 127.0.0.1 -p "$PORT" -U "$DB_USER" -d postgres -tAc "select 1 from pg_database where datname = '$DB_NAME'" | grep -q 1; then
      createdb -h 127.0.0.1 -p "$PORT" -U "$DB_USER" "$DB_NAME"
    fi
    echo "Database ready: postgres://$DB_USER:local@127.0.0.1:$PORT/$DB_NAME"
    ;;
  stop)
    if pg_ctl -D "$DATA_DIR" status >/dev/null 2>&1; then
      pg_ctl -D "$DATA_DIR" stop >/dev/null
      echo "PostgreSQL stopped."
    else
      echo "PostgreSQL is not running."
    fi
    ;;
  status)
    if pg_ctl -D "$DATA_DIR" status; then
      pg_isready -h 127.0.0.1 -p "$PORT" -U "$DB_USER"
    fi
    ;;
  *)
    echo "Usage: $0 {start|stop|status}" >&2
    exit 2
    ;;
esac
