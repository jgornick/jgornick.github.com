---
title: "{{ replace .TranslationBaseName "-" " " | title }}"
description: ""
date: {{ .Date }}
slug: "{{ substr .File.UniqueID 0 7 }}"
draft: true
tags: []
cover: ""
toc: false
---