---
layout: post
title: "Setting up multiple browsers on Mac OS X"
date: 2010-01-14 16:32
comments: true
categories:
---

When doing web development, you need to test your work on many operating systems and browsers. Depending on your host operating system, you will also need to run virtual machines to test other operating systems and browsers. For this article, we are focusing on setting up different browsers/version on OS X (10.6 - Snow Leopard).

For Mac, the most common browsers are Safari, Firefox, Opera and recently Chrome. On my machine, I have setup the following browsers and versions:

*   Safari: 2.04, 3.04, 3.12, 3.21, 4.04
*   Firefox: 2.0.0.20, 3.0.17, 3.5.7
*   Opera: 9.52, 9.64, 10.01, 10.10
*   Chrome: 4.0.249.49 (Latest)

<!-- more -->

Well, let's get to it!

First, I setup a folder in my Applications called Browsers (`/Applications/Browsers`). I will explain later why we place all of our browsers in the Browsers folder. Now, let's install each browser individually.

### Safari

Since I'm running OS X 10.6 with latest updates, Safari version 4.04 is installed. So, in order to install previous versions, I use [Multi Safari][5]. Multi Safari provides different versions of Safari with the specified WebKit bundled into the application.

To install, you simply download the files, and extract to our `/Applications/Browsers` directory. All of the applications are named appropriately and ready to execute. To my knowledge, there isn't any profile management we need to perform unlike Firefox and Opera.

### Firefox

To get started, we need to download the specific versions. During the time of writing, 3.5.7 was the latest version. I was able to download easily from [mozilla.com][6]. Next we need to find archived versions. These are located on [Mozilla's FTP server][7]. Once you've downloaded the versions you're interested in, let's start the installation process.

In order to run multiple instances of Firefox, I've found the best way is to create a different profile for each version use that profile when launching the browser. Since I'm only interested in 2.x, 3.0.x and 3.5.x, I like to start with the oldest version first. So, copy the Firefox application over to our `/Applications/Browsers` directory. Once installed, we need to immediately rename it. I renamed my to `Firefox 2`.

Next, let's modify the script to launch Firefox and setup our profile. Open up Terminal and perform the following commands:

    cd /Applications/Browsers/Firefox\ 2.app/Contents/MacOS
    mv firefox-bin firefox.bin
    echo '!#/bin/bash' > firefox-bin
    echo '/Applications/Browsers/Firefox\ 2.app/Contents/MacOS/firefox.bin -P firefox2 -no-remote' >> firefox-bin
    chmod +x firefox-bin

The previous commands essentially rename `firefox-bin` to `firefox.bin` and create a new bash script to execute `firefox.bin` with a specified profile and to tell Firefox that it's OK to run more than one instance. You may be asking yourself, why is `firefox-bin` so important? Well, `firefox-bin` is the bundle executable (`CFBundleExecutable`) according to the `Info.plist` in `Firefox 2.app`. This means, when you load the application, it executes `firefox-bin`. You can look at other command line arguments [here][8].

Now, before you run the application, let's setup our "firefox2" profile. In the same directory, enter command: `./firefox.bin -ProfileManager`. This will prompt you with the Firefox profile manager where you will want to create a new profile labeled "firefox2" (which is what we used as the `-P` argument in `firefox-bin`). Once you've created the profile, exit from the profile manager and try loading the application by double clicking on it through Finder.

These steps can be repeated for each specific version you want to install. Just keep in mind, the rule I follow is to create a new profile for each version being installed. So, for example, Firefox 3.5, I would create a "firefox35" profile and setup my `firefox-bin` to load it.

A few notes:

* If you installed OS X with the "Case-sensitive, Journaled" file system, multiple Firefox instances do not seem to work. If you find a work-around, please let me know, I had to re-install after having an unsuccessful attempt.
* I like to tell my different versions of Firefox to not update automatically. However, if you forget and it updates, you will simply need to follow the previous steps after the update has been applied.

### Opera

I've provided a link to the [Download for Mac OS X][9] on Opera's website. This link also contains another link to more archived versions.

The steps taken after downloading your versions are somewhat similar to how we handled Firefox. So, I will use the example of starting with the oldest version I've decided to install, 9.52. So, copy the Opera application over to our `/Applications/Browsers` directory. Once installed, we need to immediately rename it to `Opera 9.52`.

In order to keep individual profiles of Opera, you need to provide a `PrefsSuffix` file in the `/Applications/Browsers/Opera 9.52.app/Content/Resources` directory of the application. This file will tell Opera what suffix needs to be added to the preferences folder created in `~/Library/Preferences`. Use the following command to set this up:

    echo '9.52' > /Applications/Browsers/Opera\ 9.52.app/Contents/Resources/PrefsSuffix

That's it! Now you can run the application and you will notice a folder is created in the `~/Library/Preferences/Opera Preferences 9.52`. If you intend to install more versions, follow the same instructions that we just used.

### Chrome

When writing this article, Google Chrome is in beta. I was able to download the latest version [here][10]. Since there's only one version of Chrome for Mac OS X, I didn't have to do any profile setup. However, I'm sure when Chrome 5 arrives, I'll have to figure this out so I can run different versions of Chrome simultaneously.

### Browsers Folder + Dock

Ok, all of our browsers are setup and ready to roll. However, remember earlier I said I would explain why we created the `/Applications/Browsers` folder? Well, because it provides a nice way to be able to load any browser from your dock. The attached screenshot is the `Browsers` folder dragged to my dock.

I hope this helps my fellow web developers in setting up your environment.

 []: http://joegornick.com/wp-content/uploads/2010/01/browsers.jpg
 [5]: http://michelf.com/projects/multi-safari/
 [6]: http://www.mozilla.com
 [7]: http://ftp.mozilla.org/pub/mozilla.org/mozilla.org/firefox/releases/
 [8]: http://kb.mozillazine.org/Command_line_arguments
 [9]: http://www.opera.com/browser/download/?os=mac&list=all
 [10]: http://www.google.com/chrome
