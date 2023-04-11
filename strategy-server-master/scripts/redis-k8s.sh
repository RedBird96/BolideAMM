#!/bin/sh
export KUBECONFIG=ennlo-k8s-dev-kubeconfig.yaml
kubectl port-forward -n alpha service/redis-master 6378:6379