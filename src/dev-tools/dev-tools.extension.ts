import { ObservableStore } from '../observable-store';
import { ReduxDevtoolsExtensionConnection, ReduxDevtoolsExtension, ReduxDevtoolsExtensionConfig } from './dev-tools.interfaces';
import { EMPTY, Observable, Subscription } from 'rxjs';
import { delay } from 'rxjs/operators';

export class DevToolsExtension extends ObservableStore<any>  {
    private window = (window as any);
    private extensionConnection: ReduxDevtoolsExtensionConnection;
    private devtoolsExtension = (window as any)['__REDUX_DEVTOOLS_EXTENSION__'];

    constructor() {
        super({ trackStateHistory: true, logStateChanges: false });
        this.sync();
    }

    init(config?: ReduxDevtoolsExtensionConfig) {
        if (!this.devtoolsExtension) {
            return EMPTY;
        }

        return new Observable(subscriber => {
            const connection = this.devtoolsExtension.connect(config);
            this.extensionConnection = connection;
            connection.init(config);

            connection.subscribe((change: any) => subscriber.next(change));
            return connection.unsubscribe;
        }).subscribe((action: any) => {
            if (action.type === 'DISPATCH') {
                if (action.payload.type === 'JUMP_TO_STATE' && action.state) {
                    this.setDevToolsState(JSON.parse(action.state), 'DEVTOOLS_JUMP');
                }
            }
        });
    }

    private setDevToolsState(state: any, action: string) {
        // #### Run in Angular zone if it's available
        if (this.window.ng && this.window.getAllAngularRootElements) {
            const ngZone = this.window.ng.probe(this.window.getAllAngularRootElements()[0]).injector.get(this.window.ng.coreTokens.NgZone);
            ngZone.run(() => {
                this.setState(state, action);
            });
        }
        else {
            this.setState(state, action);
        }
    }

    private sync() {
        this.globalStateChanged.subscribe(() => {
            this.sendStateToDevTool();
        });
    }
    
    private sendStateToDevTool() {
        if (this.stateHistory && this.stateHistory.length) {
            const lastItem = this.stateHistory[this.stateHistory.length - 1];
            const { action, endState } = lastItem;

            if (action !== 'DEVTOOLS_JUMP') {
                this.extensionConnection.send(action, endState);
            }
        }
    }
}