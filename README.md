# WidgetHub Customized version @IEDIB

- Design, use and customize widget components seamlessly within the Tiny Editor.
- Use Bootstrap components easily.

> [!CAUTION]
> This is a customized version of the Moodle plugin widgethub. If you are interested in a mantained community version, please check the repository [jmulet/moodle-tiny_widgethub](https://github.com/jmulet/moodle-tiny_widgethub)


> [!IMPORTANT]
> This plugin needs a Moodle theme based on Boost since some widgets rely on Bootstrap.

## Features

Users can:

1. Choose a widget.
2. Customize its appearance.
3. Insert it into the Tiny editor.

Later, at any time, the component can be reconfigured using context menus provided by the Tiny editor.

<img src="./img/widgethub_usage.gif" width="400" style="margin:auto;max-width:400px">


## Learn more

- [Examples: Learn how to customize and create widgets.](docs/examples.md)
- [Yaml API reference.](docs/api.md)

## Migration from Moodle 4x to Moodle 5.0

> [!IMPORTANT]
> To ensure Bootstrap components that rely on JavaScript function correctly in both Moodle 4.x and Moodle 5.0, we recommend using both `data-xxx` and `data-bs-xxx` attributes in your widget templates. While this makes the templates slightly more verbose, it eliminates the need for custom JavaScript to handle attribute differences.

For widgets already present on a page, you can automatically add the missing `data-bs-xxx` attributes. Refer to the `oninit.refractor.bs5` configuration option below for details.

## Configuration

Administrators can manage widget definitions by customizing existing ones, creating new ones, or removing unwanted widgets. To access these options, simply type `widget` in the search field of the administrator area.

The options available are:

<img src="./img/settings.png" width="400" style="margin:auto;max-width:400px">

- **share_css**: When this checkbox is selected, all styles from the Moodle site will automatically be available within the editor's iFrame. Additional styles can be added via the administration page of your theme.


- **additionalcss**: If you prefer to keep the styles in the editor isolated from Moodle styles, add the desired styles in this textarea to make them available in the editor. URLs within comment blocks will automatically be translated into a CSS `link` tag in the editor iFrame.


- **cfg**: This allows additional configuration using the syntax `property=value`, with one configuration per line:  
  
  - *disable.plugin.pages*: A **comma-separated** list of body IDs for which the plugin will not be loaded.  

  - *disable.plugin.pages.regex*: A **regular expression** that matches those body IDs for which the plugin will not be loaded.  

  - *enable.contextmenu.level*: Enable (`1`) or disable (`0`) context menus used by the plugin.

  - *category.order=misc:a1,idiomes:z1*: Overrides the default alphabetical category ordering. Provide a comma-separated string using the format `categoryName:sortingName`. The `sortingName` is used to determine the sort order among the listed categories. Categories not included in this list will maintain their default alphabetical order.

  - *oninit.refractor.ids=1* - Enable (`1`) or disable (`0`) automatic refracting of bad id identifiers affecting tabmenus and dropdowns when the editor opens (default: 1).
 
  - *oninit.refractor.bs5=1* - Enable (`1`) or disable (`0`) automatic refractoring of Bootstrap 5 `data-bs-xxx` attributes when the editor opens (default: 1).

The capability 'tiny/ibwidgethub:viewplugin' allows to set the plugin visibility for any role. Keep in mind that, by default, the role student is prevented from using the plugin.

 
 
## How to build

### Generate AMD modules

In order to generate the compiled code in `/amd/build` from sources in `/amd/src`, you need to execute the command

```
npx grunt amd
```

### Generate yalm editor dependency

Please refer to the documentation in libs/codemirror.


## Thanks

This plugin was originally inspired by the plugin [Snippet](https://moodle.org/plugins/atto_snippet) by Justin Hunt.

A version for the editor Atto of this plugin has been used in the institution [https://iedib.net/](IEDIB) since several years ago. 

Icons by [Fontawesome 6.4](https://fontawesome.com/icons/file-code?f=classic&s=light).
