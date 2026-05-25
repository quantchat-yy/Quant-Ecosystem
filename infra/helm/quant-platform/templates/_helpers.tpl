{{/*
Expand the name of the chart.
*/}}
{{- define "quant-platform.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "quant-platform.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "quant-platform.labels" -}}
helm.sh/chart: {{ include "quant-platform.name" . }}-{{ .Chart.Version | replace "+" "_" }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
app.kubernetes.io/part-of: quant-platform
{{ include "quant-platform.selectorLabels" . }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "quant-platform.selectorLabels" -}}
app.kubernetes.io/name: {{ include "quant-platform.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Service-specific labels
*/}}
{{- define "quant-platform.serviceLabels" -}}
helm.sh/chart: {{ include "quant-platform.name" .root }}-{{ .root.Chart.Version | replace "+" "_" }}
app.kubernetes.io/managed-by: {{ .root.Release.Service }}
app.kubernetes.io/version: {{ .root.Chart.AppVersion | quote }}
app.kubernetes.io/part-of: quant-platform
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .name }}
{{- end }}

{{/*
Service-specific selector labels
*/}}
{{- define "quant-platform.serviceSelectorLabels" -}}
app.kubernetes.io/name: {{ .name }}
app.kubernetes.io/instance: {{ .root.Release.Name }}
app.kubernetes.io/component: {{ .name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "quant-platform.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "quant-platform.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Image reference with global registry
*/}}
{{- define "quant-platform.image" -}}
{{- if .root.Values.global.imageRegistry }}
{{- printf "%s/%s:%s" .root.Values.global.imageRegistry .svc.image.repository .svc.image.tag }}
{{- else }}
{{- printf "%s:%s" .svc.image.repository .svc.image.tag }}
{{- end }}
{{- end }}
