/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

import * as vscode from 'vscode';

import { RazorLogger } from '../RazorLogger';
import { onDidTerminateDebugSession } from './TerminateDebugHandler';

export class BlazorDebugConfigurationProvider implements vscode.DebugConfigurationProvider {

    constructor(private readonly logger: RazorLogger, private readonly vscodeType: typeof vscode) { }

    public async resolveDebugConfiguration(folder: vscode.WorkspaceFolder | undefined, configuration: vscode.DebugConfiguration): Promise<vscode.DebugConfiguration | undefined> {
        const shellPath = process.platform === 'win32' ? 'cmd.exe' : 'dotnet';
        const shellArgs = process.platform === 'win32' ? ['/c', 'chcp 65001 >NUL & dotnet run'] : ['run'];
        const spawnOptions = {
            cwd: configuration.cwd || (folder && folder.uri && folder.uri.fsPath),
        };

        const output = this.vscodeType.window.createTerminal({
          name: 'Blazor WebAssembly App',
          shellPath,
          shellArgs,
          ...spawnOptions,
        });

        /**
         * On non-Windows platforms, we need to terminate the Blazor
         * dev server and its child processes.
         */
        const terminate = this.vscodeType.debug.onDidTerminateDebugSession(async event => {
            await onDidTerminateDebugSession(event, this.logger, await output.processId);
            terminate.dispose();
        });

        output.show(/*preserveFocus*/true);

        const browser = {
            name: '.NET Core Debug Blazor Web Assembly in Browser',
            type: configuration.browser === 'edge' ? 'pwa-msedge' : 'pwa-chrome',
            request: 'launch',
            timeout: configuration.timeout || 30000,
            url: configuration.url || 'https://localhost:5001',
            webRoot: configuration.webRoot || '${workspaceFolder}',
            inspectUri: '{wsProtocol}://{url.hostname}:{url.port}/_framework/debug/ws-proxy?browser={browserInspectUri}',
            trace: configuration.trace || false,
            noDebug: configuration.noDebug || false,
        };

        try {
            /**
             * The browser debugger will immediately launch after the
             * application process is started. It waits a `timeout`
             * interval before crashing after being unable to find the launched
             * process.
             *
             * We do this to provide immediate visual feedback to the user
             * that their debugger session has started.
             */
            await this.vscodeType.debug.startDebugging(folder, browser);
            this.logger.logVerbose('[DEBUGGER] Launching browser debugger...');
        } catch (error) {
            this.logger.logError(
                '[DEBUGGER] Error when launching browser debugger: ',
                error,
            );
            const message = `There was an unexpected error while launching your debugging session. Check the console for helpful logs and visit the debugging docs for more info.`;
            this.vscodeType.window.showErrorMessage(message, `View Debug Docs`, `Ignore`).then(async result => {
                if (result === 'View Debug Docs') {
                    const debugDocsUri = 'https://aka.ms/blazorwasmcodedebug';
                    await this.vscodeType.commands.executeCommand(`vcode.open`, debugDocsUri);
                }
            });
        }

        /**
         * If `resolveDebugConfiguration` returns undefined, then the debugger
         * launch is canceled. Here, we opt to manually launch the browser
         * configruation using `startDebugging` above instead of returning
         * the configuration to avoid a bug where VS Code is unable to resolve
         * the debug adapter for the browser debugger.
         */
        return undefined;
    }
}
