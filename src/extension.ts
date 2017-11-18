'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { window, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem } from 'vscode';
import * as WebSocket from 'ws';
import Cache from 'vscode-cache';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: ExtensionContext) {
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "vscode-gmusic" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = commands.registerCommand('extension.sayHello', () => {
        // The code you place here will be executed every time your command is executed
        let gMusic = new gMusicClass(context);

        // Display a message box to the user
        window.showInformationMessage('Enabling vscode-gmusic...');
    });

    context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() {
}

interface track {
    title: string;
    artist: string;
    album: string;
    albumArt: string;
}
interface time {
    current: number;
    total: number;
}

interface gMusicResponse {
    channel: string;
    payload: any;
}

interface rating {
    liked: boolean;
    disliked: boolean;
}

/**
 * Constantly changing class that holds GPMDP data
 * 
 * @export
 * @class gMusicData
 */
export class gMusicClass {
    private _statusBarItem: StatusBarItem;

    private _playState: boolean;
    private _track: track;
    private _time: time;
    private _rating: rating;
    private _shuffle: string;
    private _repeat: string;
    private _onChange: any;
    private ws: any;

    constructor(context: ExtensionContext) {
        // Create as needed
        if (!this._statusBarItem) {
            this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        }

        this.ws = new WebSocket('ws://localhost:5672')
        // let musicCache = new Cache(context);

        // Being "polite" and asking GPMDP if we can have control.
        this.ws.on('open', () => {
            this.ws.send(JSON.stringify({
                namespace: 'connect',
                method: 'connect',
                arguments: ['vscode-gmusic']
            }))
        })

        // Receiving data from GPMDP.
        this.ws.on('message', (data) => {
            let gMusicResponse: gMusicResponse = JSON.parse(data);
            console.log(data);
            switch (gMusicResponse.channel) {
                case 'connect':
                    if (gMusicResponse.payload === 'CODE_REQUIRED') {
                        // if (musicCache.has('authCode')) {
                        //     this.ws.send(JSON.stringify({
                        //         namespace: 'connect',
                        //         method: 'connect',
                        //         arguments: ['vscode-gmusic', musicCache.get('authCode')]
                        //     }))
                        // } else {
                        window.showInputBox({ prompt: 'Please input the number shown on GPMDP' }).then(code => {
                            console.log(code);
                            this.ws.send(JSON.stringify({
                                namespace: 'connect',
                                method: 'connect',
                                arguments: ['vscode-gmusic', code]
                            }))
                        })
                        // }
                    // } else {
                    //     musicCache.put('authCode', gMusicResponse.payload)
                    }
                    break;
                case 'PlayState':
                    this._playState = gMusicResponse.payload;
                    break;
                case 'Track':
                    this._track = gMusicResponse.payload;
                    break;
                case 'Time':
                    this._time = gMusicResponse.payload;
                    break;
                case 'Rating':
                    this._rating = gMusicResponse.payload;
                    break;
                case 'Shuffle':
                    this._shuffle = gMusicResponse.payload;
                    break;
                case 'Repeat':
                    this._repeat = gMusicResponse.payload;
                    break;
            }
        });

        this.ws.on('error', (err) => window.showErrorMessage('An error occured when talking with GPMDP! Error: ' + err));
    }

    public get playState(): boolean {
        return this._playState;
    }

    public set playState(value: boolean) {
        this._playState = value;
    }

    public get track(): track {
        return this._track;
    }

    public set track(value: track) {
        this._track = value;
        this._statusBarItem.text = value.title
    }

    public get time(): time {
        return this._time;
    }

    public set time(value: time) {
        this._time = value;
    }

    public get rating(): rating {
        return this._rating;
    }

    public set rating(value: rating) {
        this._rating = value;
    }

    public get shuffle(): string {
        return this._shuffle;
    }

    public set shuffle(value: string) {
        this._shuffle = value;
    }

    public get repeat(): string {
        return this._repeat;
    }

    public set repeat(value: string) {
        this._repeat = value;
    }

    public togglePlay() {
        this.ws.send(JSON.stringify({
            namespace: 'playback',
            method: 'playPause',
            arguments: null
        }))
    }

    public forward() {
        this.ws.send(JSON.stringify({
            namespace: 'playback',
            method: 'forward',
            arguments: null
        }))
    }

    public rewind() {
        this.ws.send(JSON.stringify({
            namespace: 'playback',
            method: 'rewind',
            arguments: null
        }))
    }

    public toggleShuffle() {
        this.ws.send(JSON.stringify({
            namespace: 'playback',
            method: 'toggleShuffle',
            arguments: null
        }))
    }

    public toggleRepeat(mode: string) {
        this.ws.send(JSON.stringify({
            namespace: 'playback',
            method: 'setRepeat',
            arguments: mode
        }))
    }

    public setThumbs(thumbsUp: boolean, thumbsDown: boolean) {
        let numberRating = 0;
        if (thumbsUp) {
            numberRating = 5;
        } else if (thumbsDown) {
            numberRating = 1
        } else {
            this.ws.send(JSON.stringify({
                namespace: 'rating',
                method: 'resetRating',
                arguments: null
            }))
            return
        }
        this.ws.send(JSON.stringify({
            namespace: 'rating',
            method: 'setRating',
            arguments: numberRating
        }))
    }

}