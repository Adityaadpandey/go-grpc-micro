FROM postgres:15

COPY up.sql /docker-entrypoint-initdb.d/1.sql

