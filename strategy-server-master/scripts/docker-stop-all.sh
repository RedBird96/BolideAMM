#!/bin/sh
docker kill $(docker ps -q)
echo "All containers is stopped"
