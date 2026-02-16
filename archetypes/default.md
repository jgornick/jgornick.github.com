---
title: "{{ replace .TranslationBaseName "-" " " | title }}"
description: ""
date: {{ .Date }}
slug: "{{ substr .File.UniqueID 0 7 }}"
draft: true
tags: []
cover: "" # Recommended: 1920×1080px (16:9) or 2000×1000px (2:1)
toc: false
---