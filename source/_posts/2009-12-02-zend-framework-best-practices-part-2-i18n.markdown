---
layout: post
title: "Zend Framework Best Practices – Part 2: I18n"
date: 2009-12-02 22:54
comments: true
categories:
---

For the second part of my Zend Framework Best Practices series, I'd like to show you what I've found to be a simple and solid implementation of internationalizing your website.

Zend Framework already contains components like [Zend_Locale][5] and [Zend_Translate][6] to assist in internationalizing your website. You use the `Zend_Locale` instance in conjunction with the `Zend_Translate` to know what current locale is being used and how to translate the content. I'm going to show you how to implement these into your website.

If you haven't read the [first part of this series][7], I would recommend it as all my examples here will be based on that structure.

<!-- more -->

To start off, let's talk about how we are going to allow our website to know what locale to use. What I've found to be a common practice to switch locales is based off of the URL. For example, a sample format may look like `mysite.com/:locale/controller/action`. Locales are usually represented with a `language_REGION` combination. However, locales in our case are specified by only the `language` code. You can find a list of language codes [here][8]. If you wanted your site to be in Japanese, you would use the language code of `ja`. An example of the URL might look something like `mysite.com/ja/controller/action`. On top of specifying the locale in the path of the URL, I've also provided a way to determine the locale based off of the TLD in the URL. For example, let's say our `mysite.com` also has a Japanese TLD like `mysite.jp`. When a request comes in and we find a supported TLD, we set the localed based on it.

Enough talk, let's look at some code.

Let's start by setting up our `Zend_Locale`. In the `application.ini`, we use the `Zend_Application_Resource_Locale` to setup the locale component and set our default locale. In our case here, I'm setting the default locale to **English**.

application.ini:

    ...
    # Locale
    resources.locale.default = "en"
    ...

Next, we need to tell our application which locales are supported and also specify our TLD mappings. We do this by specifying front controller parameters in the `application.ini`.

application.ini:

    ...
    # Front Controller Params
    resources.frontController.params.locales&#91;&#93; = "en"
    resources.frontController.params.locales&#91;&#93; = "ja"
    resources.frontController.params.tldLocales.jp = "ja"
    ...

If you notice from the configuration above, I've added English and Japanese as my supported locales and I also mapped the `jp` TLD to use the `ja` language code. More on how we use those later.

Before I show the rest of the configuration needed, let me explain how the process works.

In order for your application to recognize when a locale is specified in the URL, you need to create special routes to parse out the locale. The approach I took was to override the existing `Zend_Application_Resource_Router` and implement the ability to automatically add locale routes to the application when enabled.

The process in which I added routes to my application was done previously in my `Bootstrap.php` with the `_initRoutes()` method. I've removed that code and moved the routes to be configured in the `application.ini`. Now that the routes are specified in the `application.ini`, it allows us to easily add/edit/remove routes from our application. There is also a benefit to doing this in regards to caching, which I will explain in a future article.

First, let's take a look at how we will load the custom router application resource and override the existing application resource.

application.ini

    ...
    # Custom Resource Plugins
    pluginPaths.My_Application_Resource = APPLICATION_PATH "/../lib/My/Application/Resource/"
    ...

Now the application is setup to load custom application resources for the namespace specified. Since I am overriding the `Zend_Application_Resource_Router`, let's look at `My_Application_Resource_Router`:

My/Application/Resource/Router.php:

{% codeblock lang:php %}
<?php
class My_Application_Resource_Router extends Zend_Application_Resource_Router
{
    public $_explicitType = 'router';

    protected $_front;
    protected $_locale;

    /**
     * Retrieve router object
     *
     * @return Zend_Controller_Router_Rewrite
     */
    public function getRouter()
    {
        $options = $this->getOptions();

        if (!isset($options['locale']['enabled']) ||
            !$options['locale']['enabled']) {
            return parent::getRouter();
        }

        $bootstrap = $this->getBootstrap();

        if (!$this->_front) {
            $bootstrap->bootstrap('FrontController');
            $this->_front = $bootstrap->getContainer()->frontcontroller;
        }

        if (!$this->_locale) {
            $bootstrap->bootstrap('Locale');
            $this->_locale = $bootstrap->getContainer()->locale;
        }

        $defaultLocale = array_keys($this->_locale->getDefault());
        $defaultLocale = $defaultLocale[0];

        $locales = $this->_front->getParam('locales');
        $requiredLocalesRegex = '^(' . join('|', $locales) . ')$';

        $routes = $options['routes'];
        foreach ($routes as $key => $value) {
            // First let's add the default locale to this routes defaults.
            $defaults = isset($value['defaults'])
                ? $value['defaults']
                : array();

            // Always default all routes to the Zend_Locale default
            $value['defaults'] = array_merge(array( 'locale' => $defaultLocale ), $defaults);

            $routes[$key] = $value;

            // Get our route and make sure to remove the first forward slash
            // since it's not needed.
            $routeString = $value['route'];
            $routeString = ltrim($routeString, '/\\');

            // Modify our normal route to have the locale parameter.
            if (!isset($value['type']) ||
                $value['type'] === 'Zend_Controller_Router_Route') {
                $value['route'] = ':locale/' . $routeString;

                $value['reqs']['locale'] = $requiredLocalesRegex;

                $routes['locale_' . $key] = $value;
            } else if ($value['type'] === 'Zend_Controller_Router_Route_Regex') {
                $value['route'] = '(' . join('|', $locales) . ')\/' . $routeString;

                // Since we added the local regex match, we need to bump the existing
                // match numbers plus one.
                $map = isset($value['map']) ? $value['map'] : array();
                foreach ($map as $index => $word) {
                    unset($map[$index++]);
                    $map[$index] = $word;
                }

                // Add our locale map
                $map[1] = 'locale';
                ksort($map);

                $value['map'] = $map;

                $routes['locale_' . $key] = $value;
            } else if ($value['type'] === 'Zend_Controller_Router_Route_Static') {
                foreach ($locales as $locale) {
                    $value['route'] = $locale . '/' . $routeString;
                    $value['defaults']['locale'] = $locale;
                    $routes['locale_' . $locale . '_' . $key] = $value;
                }
            }
        }

        $options['routes'] = $routes;
        $this->setOptions($options);

        return parent::getRouter();
    }
}
{% endcodeblock %}

In order for this custom application resource to override the existing one, the key is `public $_explicitType = 'router';`. Now when routes are setup in the `application.ini` for the router resource it won't use the `Zend_Application_Resource_Router`, but rather `My_Application_Resource_Router`.

This application resource sets up the `Zend_Controller_Router_Rewrite` by parsing the specified options parsed from the `application.ini`. Notice this custom application resource extends from the original `Zend_Application_Resource_Router` which allows us to have the application resource perform the default actions if the locale option is not enabled in the configuration. By default, the custom router application resource will perform the default actions to the routes. You need to explicitly specify in the `application.ini` that the router is locale aware.

`My_Application_Resource_Router` simply takes in the specified routes from the `application.ini` and adds locale routes automatically so you don't have to chain/duplicate routes in the configuration.

Let's look at our `application.ini` to see how we are setting up the router to be locale aware and adding a route.

application.ini:

    ...
    # Router/Routes
    resources.router.locale.enabled = true
    resources.router.routes.action_index.route = ":action/*"
    resources.router.routes.action_index.defaults.controller = "index"
    resources.router.routes.action_index.defaults.action = "index"
    ...

In the previous configuration snippet, we enable our router application resource to be locale aware and add a basic `Zend_Controller_Router_Route` which is the same as specified previously in our `Bootstrap.php`. When the router application resource is finished adding the routes to the router, there will be two:

1.  `:action/*`
2.  `:locale/:action/*`

Currently the `My_Application_Resource_Router` supports `Zend_Controller_Router_Route`, `Zend_Controller_Router_Route_Regex` and `Zend_Controller_Router_Static` routes. When these routes are specified and the router application resource is locale aware, it will automatically create routes for the supported locales.

We've covered a lot already, but there are still a few more steps involved. We are almost finished, I promise!

At this point, we have specified our default and supported locales and setup our routes using our custom router application resource. Now we need to do one more thing and that is to determine which locale to load and create our `Zend_Translate` instance.

In order for us to determine which locale, if any, has been specified in the request, we use a controller plugin to parse the request and set the correct locale and setup our translation component.

First, we need to enable the controller plugin in our `application.ini`.

application.ini:

    ...
    # Front Controller Plugins
    resources.frontController.plugins.I18n = "My_Controller_Plugin_I18n"
    ...

Next, let's look at the controller plugin source:

My/Controller/Plugin/I18n.php:

{% codeblock lang:php %}
<?php
class My_Controller_Plugin_I18n extends Zend_Controller_Plugin_Abstract
{
    /**
    * Sets the application locale and translation based on the locale param, if
    * one is not provided it defaults to english
    *
    * @param Zend_Controller_Request_Abstract $request
    */
    public function routeShutdown(Zend_Controller_Request_Abstract $request)
    {
        $frontController = Zend_Controller_Front::getInstance();
        $params = $request->getParams();
        $registry = Zend_Registry::getInstance();

        // Steps setting the locale.
        // 1. Defaults to English (Done in config)
        // 2. TLD in host header
        // 3. Locale params specified in request
        $locale = $registry->get('Zend_Locale');

        // Check host header TLD.
        $tld = preg_replace('/^.*\./', '', $request->getHeader('Host'));

        // Provide a list of tld's and their corresponding default languages
        $tldLocales = $frontController->getParam('tldLocales');

        if (array_key_exists($tld, $tldLocales)) {
            // The TLD in the request matches one of our specified TLD -> Locales
            $locale->setLocale($tldLocales[$tld]);
        } else if (isset($params['locale'])) {
            // There is a locale specified in the request params.
            $locale->setLocale($params['locale']);
        }

        // Now that our locale is set, let's check which language has been selected
        // and try to load a translation file for it. If the language is the default,
        // then we do not need to load a translation.
        $language = $locale->getLanguage();
        if ($language !== $locale->getDefault()) {
            $i18nFile = APPLICATION_PATH . '/data/i18n/source-' . $language . '.mo';
            try {
                $translate =
                    new Zend_Translate('gettext', $i18nFile, $locale, array('disableNotices' => true));

                Zend_Registry::set('Zend_Translate', $translate);
                Zend_Form::setDefaultTranslator($translate);
            } catch (Zend_Translate_Exception $e) {
                // Since there was an error when trying to load the translation catalog,
                // let's not load a translation object which essentially defaults to
                // locale default.
            }
        }

        // Now that we have our locale setup, let's check to see if we are loading
        // a language that is not the default, and update our base URL on the front
        // controller to the specified language.
        $defaultLanguage = array_keys($locale->getDefault());
        $defaultLanguage = $defaultLanguage[0];

        $path = '/' . ltrim($request->getPathInfo(), '/\\');

        // If the language is in the path, then we will want to set the baseUrl
        // to the specified language.
        if (preg_match('/^\/' . $language . '\/?/', $path)) {
            $frontController->setBaseUrl($frontController->getBaseUrl() . '/' . $language);
        }

        setcookie('Zend_Locale', $language, null, '/', $request->getHttpHost());
    }
}
{% endcodeblock %}

To start, notice this plugin listens on the `routeShutdown()` method. We use this because our request has gone through our router and the request is now setup and ready to be processed. In the `routeShutdown()` method, we first load our `Zend_Locale` instance from the registry where it was set up in our `application.ini`. Next, we need to determine which locale, if any, needs to be set. By default, we've set our locale to use English (en) in our `application.ini`. We will parse out the TLD from the host and see if it maps to one of our specified TLD locales. If that doesn't exist, then we will look in the request to see if the locale param was set. If both of the checks can't find a specified locale, we then simply use the default.

Since our locale is now setup, we need to load a translation file. In my example provided, I use `gettext` translation files. I place these files in the `app/data/i18n` folder. The file naming scheme looks like `source-{locale}.mo`. Another example would be if we had a Japanese translation file, it would look something like `source-ja.mo`. The plugin will try to load the translation file based on the locale language specified and add it to our `Zend_Registry` and tell our `Zend_Form` it's default translator.

Finally, our plugin uses the specified locale language to determine if we need to update our base URL in the front controller. We want to set the base URL to the specified locale which allows other components like `Zend_Navigation` to persist the locale in the links produced.

There you have it! You're site is now internationalized and ready for it's content to be translated.

But wait, that's not all! I've also provided a view helper which produces a locale switcher. This view helper simply creates elements that contain images of the specified locale and shows the enabled/disabled locale while allowing you to click on the image and switch the current locale.

app/views/helpers/LocaleSwitcher.php:

{% codeblock lang:php %}
<?php
class Default_View_Helper_LocaleSwitcher extends Zend_View_Helper_Abstract
{
    public function localeSwitcher()
    {
        $output = array();
        $frontController = Zend_Controller_Front::getInstance();

        $locales = $frontController->getParam('locales');
        $request = $frontController->getRequest();
        $baseUrl = $request->getBaseUrl();
        $path = '/' . trim($request->getPathInfo(), '/\\');

        if (count($locales) > 0) {
            $locale = Zend_Registry::get('Zend_Locale');
            $localeLanguage = $locale->getLanguage();
            $defaultLocaleLanguage = array_keys($locale->getDefault());
            $defaultLocaleLanguage = $defaultLocaleLanguage[0];

            array_push($output, '<ul id="locale_switcher">');

            foreach ($locales as $language) {
                $imageSrc  = 'img/i18n_';
                $imageSrc .= $language . '_' . ($localeLanguage == $language ? 'on' : 'off');
                $imageSrc .= '.gif';

                $urlLanguage = $defaultLocaleLanguage == $language
                    ? ''
                    : '/' . $language;

                if (strlen($baseUrl) === 0) {
                    $localeUrl = $urlLanguage . $path;
                } else {
                    $localeUrl = preg_replace('/^' . preg_quote($baseUrl, '/') . '\/?/',
                        $urlLanguage . '/', $path);
                }

                array_push($output, '<li>');
                array_push($output, '<a href="' . $localeUrl . '">');
                array_push($output, '<img src="' . $this->view->assetUrl($imageSrc) . '" alt="' . $language . '" />');
                array_push($output, '</a>');
                array_push($output, '</li>');
            }

            array_push($output, '</ul>');
        }

        return join('', $output);
    }
}
{% endcodeblock %}

I've included an updated [Zend Framework Best Practices][9] zip file which contains all of the files/directory structure we've discussed so far in the series.

The original gist of this process can be found here: <http://gist.github.com/189194>.

That's it for now. Until next time!

 [1]: http://joegornick.com/2009/12/02/zend-framework-best-practices-part-2-i18n/ "Permanent Link to Zend Framework Best Practices â€“ Part 2: I18n"
 [2]: http://joegornick.com/wp-admin/post.php?action=edit&post=46 "Edit post"
 [3]: http://joegornick.com/category/zend-framework/ "View all posts in Zend Framework"
 [4]: http://joegornick.com/2009/12/02/zend-framework-best-practices-part-2-i18n/#comments "Comment on Zend Framework Best Practices â€“ Part 2: I18n"
 [5]: http://framework.zend.com/manual/en/zend.locale.html
 [6]: http://framework.zend.com/manual/en/zend.translate.html
 [7]: http://joegornick.com/2009/11/18/zend-framework-best-practices-part-1-getting-started/
 [8]: http://unicode.org/repos/cldr-tmp/trunk/diff/supplemental/languages_and_territories.html
 [9]: http://joegornick.com/wp-content/uploads/2009/12/zfbp.zip