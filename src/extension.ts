import { window, commands, ExtensionContext } from 'vscode'
import GoogleMusic from './googleMusic'

export function activate(context: ExtensionContext) {
  let gMusic = new GoogleMusic(context)

  let playpauseCommand = commands.registerCommand('gmusic.playpause', () => {
    gMusic.togglePlay()
  })
  let shuffleCommand = commands.registerCommand('gmusic.shuffle', () => {
    gMusic.toggleShuffle()
  })
  let skipCommand = commands.registerCommand('gmusic.skip', () => {
    gMusic.forward()
  })
  let rewindCommand = commands.registerCommand('gmusic.rewind', () => {
    gMusic.rewind()
  })
  let likeCommand = commands.registerCommand('gmusic.setThumbs', () => {
    window
      .showQuickPick(['Thumbs Up', 'Thumbs Down', 'Remove Rating'])
      .then(val => {
        switch (val) {
          case 'Thumbs Up':
            gMusic.thumbsUp()
            break
          case 'Thumbs Down':
            gMusic.thumbsDown()
            break
          case 'Remove Rating':
            gMusic.removeThumbs()
            break
        }
      })
  })
  let restartCommand = commands.registerCommand('gmusic.restart', () => {
    gMusic.dispose()
    gMusic = new GoogleMusic(context)
  })

  context.subscriptions.push(playpauseCommand)
  context.subscriptions.push(shuffleCommand)
  context.subscriptions.push(skipCommand)
  context.subscriptions.push(rewindCommand)
  context.subscriptions.push(likeCommand)
  context.subscriptions.push(restartCommand)
  context.subscriptions.push(gMusic)
}
