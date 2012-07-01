---
layout: post
title: "Zend Framework Best Practices – Part 1: Getting Started"
date: 2009-11-18 23:19
comments: true
categories:
---

Welcome to part one of my Zend Framework Best Practices series. When I started using Zend Framework a little over two years ago, I found it very difficult to find definitive methods to use when building your application. However, after the release of Zend Framework 1.8, books like [Zend Framework in Action][5], more community involvement and of course my own experiences, I feel that I've found a simple, clean and efficient way to make your application.

This series will cover many areas of a website including directory structure, bootstrapping, caching, navigation, ACL & authorization and I18N.

Disclaimer: I don't want this series to be taken as the "only way" to use Zend Framework in your application. In fact, it would be greatly appreciated if others are able to point out areas where my approach is not the most efficient and provide ways to fix it.

<!-- more -->

Ok, let's start...

I would first like to discuss the directory structure of a Zend Framework application. This is always a hot topic in #zftalk. There are two documents out on the ZF wiki which discuss a directory structure to choose. First, there was [Choosing Your Application's Directory Layout][6] which has now been deprecated by [Zend Framework Default Project Structure by Wil Sinclair.][7] The latter of the two is very close to what was adopted by `Zend_Tool`.

This is really a personal preference, but I wanted to share my directory structure. It is very similar to latest proposed version, only I use the more "classical (unix/linux)" style.

Here's an example of my initial directory structure and basic files needed:

    project/
        app/
            configs/
                application.ini
            controllers/
                helpers/
                ErrorController.php
                IndexController.php
            data/
                cache/
                i18n/
                sessions/
            forms/
            layouts/
                scripts/
                    layout.phtml
            models/
            views/
                helpers/
                    AssetUrl.php
                scripts/
                    error/
                        error.phtml
                    index/
                        index.phtml
            Bootstrap.php
        lib/
            My/
                Application.php
            Zend/
        www/
            css/
                reset.css
            img/
            js/
            .htaccess
            index.

Now that you can visually see the directory structure, let's go through setting up our application.

The `.htaccess` file is used with Apache and `mod_rewrite` to either load the file requested or pass the request to the `index.php` file.

.htaccess:

    SetEnv APPLICATION_ENV development
    &nbsp;
    RewriteEngine On
    RewriteCond %{REQUEST_FILENAME} \.(js|css|gif|jpg|png|swf)$ [OR]
    RewriteCond %{REQUEST_FILENAME} -s [OR]
    RewriteCond %{REQUEST_FILENAME} -l [OR]
    RewriteCond %{REQUEST_FILENAME} -d
    RewriteRule ^.*$ - [NC,L]
    RewriteRule ^.*$ index.php [NC,L]

If you notice on the first line, we set an environment variable, `APPLICATION_ENV`, to the value of `development`. This is used in the `index.php` to tell our bootstrap what environment we should setup for. The value can be any environment name, however, you need to make sure you configuration recognizes it. Some standard names are `development`, `staging`, `beta` and `production`. Please note though, on shared hosting plans, the `SetEnv` directive will probably not work since `mod_env` won't be installed. If this is the case, then you will need to set the environment in the `index.php` file.

Our rewrite conditions simply say, if the request isn't an asset and/or found on the file system, then redirect the request to our `index.php`.

The `index.php` file is used to initialize our application and setup the environment.

index.php:

{% codeblock lang:php %}
<?php
    // Define path to application directory
    if (!defined('APPLICATION_PATH'))
        define('APPLICATION_PATH', realpath(dirname(__FILE__) . '/../app'));

    // Define application environment
    if (!defined('APPLICATION_ENV'))
        define('APPLICATION_ENV',
            (getenv('APPLICATION_ENV') ? getenv('APPLICATION_ENV') : 'production'));

    // Add our lib folder to the include paths
    set_include_path(implode(PATH_SEPARATOR, array(
            realpath(APPLICATION_PATH . '/../lib'),
            get_include_path()
    )));

    /** My_Application */
    require_once 'My/Application.php';

    // Create application, bootstrap, and run
    $application = new My_Application(
        APPLICATION_ENV,
        array(
            'configFile' => APPLICATION_PATH . '/configs/application.ini'
        )
    );
    $application->bootstrap()->run();
{% endcodeblock %}

Our `index.php` does a few things before we bootstrap our application. First, you will notice it defines a constant for our application path. Then, it does the same thing for our application environment constant. Please note, that if the `SetEnv` does not work or the `APPLICATION_ENV` isn't defined, then it will default to production. You can change that value to whatever environment you'd like to default to.

Once our constants are setup, we then add our `lib` directory to the include path.

Now it's time to bootstrap our application. If you notice, we are using a custom class called `My_Application` which extends `Zend_Application`. This class is used to bootstrap our application while caching our `application.ini` configuration. We cache our configuration because parsing an INI file is very slow in PHP. This allows us to cache the already parsed INI as a `Zend_Config` object.

My/Application.php

{% codeblock lang:php %}
<?php
    require_once 'Zend/Application.php';
    class My_Application extends Zend_Application
    {
        /**
         * Flag used when determining if we should cache our configuration.
         */
        protected $_cacheConfig = false;

        /**
         * Our default options which will use File caching
         */
        protected $_cacheOptions = array(
            'frontendType' => 'File',
            'backendType' => 'File',
            'frontendOptions' => array(),
            'backendOptions' => array()
        );

        /**
         * Constructor
         *
         * Initialize application. Potentially initializes include_paths, PHP
         * settings, and bootstrap class.
         *
         * When $options is an array with a key of configFile, this will tell the
         * class to cache the configuration using the default options or cacheOptions
         * passed in.
         *
         * @param  string                   $environment
         * @param  string|array|Zend_Config $options String path to configuration file, or array/Zend_Config of configuration options
         * @throws Zend_Application_Exception When invalid options are provided
         * @return void
         */
        public function __construct($environment, $options = null)
        {
            if (is_array($options) && isset($options['configFile'])) {
                $this->_cacheConfig = true;

                // First, let's check to see if there are any cache options
                if (isset($options['cacheOptions']))
                    $this->_cacheOptions =
                        array_merge($this->_cacheOptions, $options['cacheOptions']);

                $options = $options['configFile'];
            }
            parent::__construct($environment, $options);
        }

        /**
         * Load configuration file of options.
         *
         * Optionally will cache the configuration.
         *
         * @param  string $file
         * @throws Zend_Application_Exception When invalid configuration file is provided
         * @return array
         */
        protected function _loadConfig($file)
        {
            if (!$this->_cacheConfig)
                return parent::_loadConfig($file);

            require_once 'Zend/Cache.php';
            $cache = Zend_Cache::factory(
                $this->_cacheOptions['frontendType'],
                $this->_cacheOptions['backendType'],
                array_merge(array( // Frontend Default Options
                    'master_file' => $file,
                    'automatic_serialization' => true
                ), $this->_cacheOptions['frontendOptions']),
                array_merge(array( // Backend Default Options
                    'cache_dir' => APPLICATION_PATH . '/data/cache'
                ), $this->_cacheOptions['backendOptions'])
            );

            $config = $cache->load('Zend_Application_Config');
            if (!$config) {
                $config = parent::_loadConfig($file);
                $cache->save($config, 'Zend_Application_Config');
            }

            return $config;
        }
    }
{% endcodeblock %}

application.ini:

{% codeblock lang:ini %}
[production]

# Debug output
phpSettings.display_startup_errors = 0
phpSettings.display_errors = 0

# PHP Date Settings
phpSettings.date.timezone = "UTC"

# Include path
includePaths.library = APPLICATION_PATH "/../lib"

# Autoloader Namespaces
autoloaderNamespaces[] = "My_"

# Bootstrap
bootstrap.path = APPLICATION_PATH "/Bootstrap.php"
bootstrap.class = "Bootstrap"

# Front Controller
resources.frontController.controllerDirectory = APPLICATION_PATH "/controllers"

# Front Controller Params
resources.frontController.params.env = APPLICATION_ENV
resources.frontController.params.cdnEnabled = "true"
resources.frontController.params.cdnHost = "http://static.site.com"

# Layout
resources.layout.layout = "layout"
resources.layout.layoutPath = APPLICATION_PATH "/layouts/scripts"

# Views
resources.view.encoding = "UTF-8"
resources.view.basePath = APPLICATION_PATH "/views/scripts"

# Database
resources.db.adapter = "mysqli"
resources.db.params.host = "localhost"
resources.db.params.username = "user"
resources.db.params.password = "password"
resources.db.params.dbname = "dbname"
resources.db.isDefaultTableAdapter = true

# Session
resources.session.save_path = APPLICATION_PATH "/data/sessions"
resources.session.gc_maxlifetime = 18000
resources.session.remember_me_seconds = 18000

# Navigation
resources.navigation.storage.registry.key = "Zend_Navigation"
resources.navigation.pages.welcome.label = "Welcome"
resources.navigation.pages.welcome.uri = "/"

[development : production]

# Debug output
phpSettings.display_startup_errors = 1
phpSettings.display_errors = 1

# Front Controller Params
resources.frontController.params.cdnEnabled = "false"

# Database
resources.db.params.dbname = "dbname"
{% endcodeblock %}

A couple of notes about the configuration file:

*   Automatically set dates to UTC
*   Automatically load classes that start with `My_` from our lib directory
*   Pass our environment to the front controller parameters
*   Set our sessions to expire after 4 hours (when used)
*   Automatically store our navigation in the registry with key `Zend_Navigation`
*   The `resources.frontController.params.cdnEnabled` setting will be explained in greater detail when I discuss caching and CDN fronting your assets

Since our application configuration has been loaded and cached, it's time to run our bootstrap.

Our `Bootstrap.php` extends from the `Zend_Application_Bootstrap_Bootstrap` class. Whenever you want to initialize resources, you need to create a protected function in our bootstrap prefixed like `protected function _init{Resource}() { ... }`.

Bootstrap.php:

{% codeblock lang:php %}
<?php
    class Bootstrap extends Zend_Application_Bootstrap_Bootstrap
    {
        /**
         * Automatically load classes that are part of the default module.
         */
        protected function _initModuleAutoloader()
        {
            new Zend_Application_Module_Autoloader(array(
                'namespace' => 'Default',
                'basePath' => APPLICATION_PATH
            ));
        }

        /**
         * Initialize our routes.
         */
        protected function _initRoutes()
        {
            $this->bootstrap('frontcontroller');
            $front = $this->getResource('frontcontroller');

            $router = $front->getRouter();
            $router->addRoute('index-action', new Zend_Controller_Router_Route(
                ':action/*',
                array(
                    'controller' => 'index',
                    'action' => 'index'
                )
            ));

            return $router;
        }

        /**
         * Get our database adapter and add it to our registry for easy access
         * throughout the application.
         */
        protected function _initDbAdapter()
        {
            $this->bootstrap('db');
            $db = $this->getPluginResource('db');

            Zend_Registry::set('db', $db->getDbAdapter());
        }

        /**
         * Initialize our view and add it to the ViewRenderer action helper.
         */
        protected function _initView()
        {
            // Initialize view
            $view = new Zend_View();

            // Add it to the ViewRenderer
            $viewRenderer =
                Zend_Controller_Action_HelperBroker::getStaticHelper('ViewRenderer');
            $viewRenderer->setView($view);

            // Return it, so that it can be stored by the bootstrap
            return $view;
        }

        /**
         * Here we will initialize any view helpers.    This will also setup basic
         * head information for the view/layout.
         */
        protected function _initViewHelpers()
        {
            $this->bootstrap(array('frontcontroller', 'view'));
            $frontController = $this->getResource('frontcontroller');
            $view = $this->getResource('view');

            // Add helper paths.
            $view->addHelperPath(APPLICATION_PATH . '/views/helpers', 'Default_View_Helper');

            // Setup our AssetUrl View Helper
            if ((bool) $frontController->getParam('cdnEnabled'))
                $view->getHelper('AssetUrl')->setBaseUrl($frontController->getParam('cdnHost'));

            // Set our DOCTYPE
            $view->doctype('XHTML1_STRICT');

            // Set our TITLE
            $view->headTitle()->setSeparator(' - ')->append('Site');

            // Add any META elements
            $view->headMeta()->appendHttpEquiv('Content-Type', 'text/html; charset=UTF-8');
            $view->headMeta()->appendHttpEquiv('Content-Style-Type', 'text/css');
            $view->headMeta()->appendHttpEquiv('imagetoolbar', 'no');

            // Add our favicon
            $view->headLink()->headLink(array(
                'rel' => 'favicon',
                'type' => 'image/ico',
                'href' => $view->baseUrl('favicon.ico')
            ));

            // Add Stylesheet's
            $view->headLink()
                ->appendStylesheet($view->assetUrl('css/reset.css'));

            // Add JavaScript's
            $view->headScript()
                ->appendFile('http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.min.js');
        }
    }
{% endcodeblock %}

A few things to take note in our `Bootstrap.php`:

*   We setup a default route that allows the user to load an action like `IndexController:testAction()` through the URL like mysite.com/test. This allows us to not have to prefix the action with the controller like mysite.com/index/test. However, since the default route is there, that would still work and any other `:controller/:action` routes
*   We store our DB adapter in the registry so we can access it throughout our application
*   When we initialize our view helpers, we add the views/helpers directory to our helper path(s) and we setup some head information for our view/layout
*   The `AssetUrl` view helper will be explained in greater detail when I discuss caching & CDN fronting your assets

Now we are at a point where our application has been setup and is ready to process the request.

We've covered a lot so far. There are a few things I didn't talk about, for example, how the `ErrorController.php` and `error.phtml` look, `AssetUrl.php`, or what the `layout.phtml` looks like. However, I have included a [Zend Framework Best Practices - Base Directory Structure/Files][8] zip file containing the file structure and base files I've discussed here.

**Update:** I found two issues with the `application.ini` and `AssetUrl.php` files. They are now fixed and the post reflects the changes.

 [1]: http://joegornick.com/2009/11/18/zend-framework-best-practices-part-1-getting-started/ "Permanent Link to Zend Framework Best Practices - Part 1: Getting Started"
 [2]: http://joegornick.com/wp-admin/post.php?action=edit&post=22 "Edit post"
 [3]: http://joegornick.com/category/zend-framework/ "View all posts in Zend Framework"
 [4]: http://joegornick.com/2009/11/18/zend-framework-best-practices-part-1-getting-started/#comments "Comment on Zend Framework Best Practices - Part 1: Getting Started"
 [5]: http://www.zendframeworkinaction.com/
 [6]: http://framework.zend.com/wiki/display/ZFDEV/Choosing+Your+Application%27s+Directory+Layout "Choosing Your Application's Directory Layout"
 [7]: http://framework.zend.com/wiki/display/ZFPROP/Zend+Framework+Default+Project+Structure+-+Wil+Sinclair
 [8]: http://joegornick.com/wp-content/uploads/2009/11/zfbp-base1.zip