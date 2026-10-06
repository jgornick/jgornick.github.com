---
title: "Let's try this again, with AI"
description: "Where AI fits on this blog, and the guardrails I'm adding so nothing gets published that I haven't reviewed."
date: 2026-10-06T10:55:00-05:00
slug: lets-try-this-again-with-ai
draft: false
tags: [ai, writing]
cover: /media/laptop-coffee-drafts.jpg
images: [/media/laptop-coffee-drafts.jpg]
toc: false
---
It's pretty easy to see that more and more of what we read online was written, at least in part, by AI. Most of the time, nobody says so.

I'd rather say so. Some of what you read here was written with help from AI.

This blog is AI-assisted, *not* AI-written. The ideas are mine, and so are the opinions. I review every post before it goes up, and I'm adding guardrails so that step can't get skipped, even by accident.

So, why use it at all? Mostly, it comes down to time. In 2019, I relaunched this blog with a post called [Let's try this again, with Hugo](https://joegornick.com/2019/04/14/lets-try-this-again-with-hugo/) and ended it hoping it wouldn't be another nine years until my next post. I managed three more that year, then went quiet for six and a half. Technically, still better than nine 😀.

The reason for the gap hasn't changed. I'm raising a family, working a full-time job, and splitting whatever's left between hobbies, side projects, and a house that always has another project waiting. Most weekends, you'll find us at a cold hockey rink. There just aren't many long, quiet stretches to sit down and write.

What I do have is a lot of ideas and perspectives, plus a few problems I've solved that I wish someone had written up for me. Writing them out is a form of therapy for me, when I get around to it. Most of the time I don't, because getting from "I have a thought" to "I have a post" takes more time than I have. That's where AI helps.

The gist of it is that I bring the idea and the opinion, and AI helps me shape it into something readable, faster than I could on my own. Usually that's some mix of:

- Talking an idea through to find out whether there's really a post in it
- Pushing back on an argument, or pointing out the objection I haven't answered yet
- Turning a messy pile of notes into a first draft
- Tightening a draft that's running long (mine usually are)

This post is a good example. It started as a few paragraphs I typed to Claude: I'm busy, I have more ideas than time, and I want readers to know where AI fits. Claude turned that into a draft and pulled a couple of details from my older posts. Then I went through it, changed what didn't sound like me, and cut anything I didn't believe.

What AI *doesn't* do is decide what I think. If a post says I believe something, I believe it. If it's published, I've read it and I stand by it.

Now, the obvious pushback: if a machine helped write it, is it really yours? And why should anyone bother reading it?

That's fair. We're all reading more AI-generated filler than we'd like, and most of it is easy to spot because there's nobody behind it. Nobody had an opinion, and nobody would notice if it were wrong. I don't want to add to that pile.

My answer is that what makes a post worth reading was never the typing. It's the idea, the experience it came from, and a person willing to put their name on it. AI isn't raising two daughters, and it has no feelings about [the tax code](https://joegornick.com/2026/09/08/earners-and-owners/). I am, and I do.

A book is still the author's even when an editor helped shape it. The difference here is that my editor also helps with the first draft, which is exactly why I'm telling you about it.

So, back to those guardrails. Most of them are still a plan. Today, this site publishes from the `main` branch of a [public GitHub repo](https://github.com/jgornick/jgornick.github.com), and my CMS commits straight to `main`. That's convenient. It also means nothing technically stops a post from going live before I've reviewed it.

I'm changing three things:

1. Every post, and every edit to a post, goes through a pull request. Nothing reaches `main` (and nothing gets published) unless I merge it myself.
2. Before I merge, AI agents review and validate the post. They check facts and links, and flag anything that doesn't sound like me.
3. Whatever they flag comes back to me. That means another round of human review, on top of the one I already did while writing it.

It's a step in the right direction, not a guarantee. I'll still get things wrong sometimes, and when I do, the fix goes through a pull request too, out in the open where anyone can see it.

My intent is *not* to hand this blog over to AI. My intent is to finally get some of these ideas out of my head and in front of someone they might help. The words that end up here are still mine, and I'm still the one who clicks merge.

*Cover photo by [Lauren Mancke](https://unsplash.com/@laurenmancke) on [Unsplash](https://unsplash.com/photos/turned-off-macbook-pro-beside-white-ceramic-mug-filled-with-coffee-aOC7TSLb1o8).*
