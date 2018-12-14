#!/bin/bash

KEYSPACE=$1

if [ "$KEYSPACE" == "" ]; then
    printf "Please specify keyspace\n"
    exit
fi

printf "\n==> Inserting into table...\n"
cqlsh -k $KEYSPACE -e "INSERT INTO <table> (
\"field_1\",
\"field_2\",
\"field_3\"
) VALUES ('value1', 'value2', 'value3')"

printf "\n==> Migration done!\n"
