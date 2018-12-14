#!/bin/bash

KEYSPACE=$1

if [ "$KEYSPACE" == "" ]; then
    printf "Please specify keyspace\n"
    exit
fi

printf "\n==> Deleting from table...\n"
cqlsh -k $KEYSPACE -e "delete from <table> where primary_key = 'value'"

printf "\n==> Migration done!\n"
