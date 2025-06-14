/* eslint-disable camelcase */
// This file is part of Moodle - http://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Tiny WidgetHub plugin.
 *
 * @module      tiny_ibwidgethub/plugin
 * @copyright   2024 Josep Mulet Pol <pep.mulet@gmail.com>
 * @license     http://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

/**
 * @typedef {*} TinyMCE
 **/

import {getTinyMCE} from 'editor_tiny/loader';
import {getPluginMetadata} from 'editor_tiny/utils';

import Common from './common';
import {register as registerOptions} from './options';
import {getSetup as getCommandSetup} from './commands';
import * as Configuration from './configuration';

const documentationUrl = 'https://github.com/IEDIB/moodle-tiny_widgethub';
const {component, pluginName} = Common;

// Import extensions to the plugin
import './extension/dependencies';
import './extension/contextmenus';
import './extension/refractor';

// Setup the plugin.
// eslint-disable-next-line no-async-promise-executor
export default new Promise(async(resolve) => {
    const [
        tinyMCE,
        pluginMetadata,
        setupCommands,
    ] = await Promise.all([
        getTinyMCE(),
        getPluginMetadata(component, pluginName, documentationUrl),
        getCommandSetup(),
    ]);

    tinyMCE.overrideDefaults({
        ...tinyMCE.defaultOptions,
        remove_trailing_brs: false, // TODO: Remove this in the future. Simply for compatibility with atto
        allow_script_urls: true, // Allow href="javascript:void(0)" used in popover
    });

    tinyMCE.PluginManager.add(pluginName,
        /** @param {TinyMCE} editor */
        (editor) => {
            // Register options.
            registerOptions(editor);

            // Setup commands.
            setupCommands(editor);

            return pluginMetadata;
        });

    // Resolve the Plugin and include configuration.
    resolve([pluginName, Configuration]);
});
