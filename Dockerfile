# syntax=docker/dockerfile:1
#
# Coolify usa ESTE Dockerfile (build en el VPS).
# No compila Nuxt: solo hace pull de la imagen ya buildeada en GitHub Actions → GHCR.
#
# Dos servicios Coolify (uno por cámara), misma registry, distinto tag:
#   IMAGE_TAG=diputados-latest   + NUXT_PUBLIC_DEFAULT_CHAMBER=diputados
#   IMAGE_TAG=senadores-latest   + NUXT_PUBLIC_DEFAULT_CHAMBER=senadores
#
# Si GHCR es privado, configurá registry login en Coolify (PAT read:packages).

ARG GHCR_IMAGE=ghcr.io/enzonotario/diputados-senadores
ARG IMAGE_TAG=senadores-latest

FROM ${GHCR_IMAGE}:${IMAGE_TAG}
