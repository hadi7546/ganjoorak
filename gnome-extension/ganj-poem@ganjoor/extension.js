import Clutter from 'gi://Clutter';
import GLib from 'gi://GLib';
import Gio from 'gi://Gio';
import Soup from 'gi://Soup?version=3.0';
import St from 'gi://St';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

const API_BASE_URL = 'https://api.ganjoor.net';

export default class GanjPoemExtension extends Extension {
  constructor(metadata) {
    super(metadata);

    this._indicator = null;
    this._label = null;
    this._poemSection = null;
    this._refreshMenuItem = null;
    this._openMenuItem = null;
    this._session = null;
    this._currentPoem = null;
    this._ = this.gettext.bind(this);
  }

  enable() {
    this._session = new Soup.Session();
    this._session.user_agent = `${this.metadata.uuid}/${this.metadata.version}`;

    this._indicator = new PanelMenu.Button(0.0, this.metadata.name, false);
    this._indicator.add_child(
      new St.Icon({
        icon_name: 'accessories-dictionary-symbolic',
        style_class: 'system-status-icon',
      }),
    );

    this._label = new St.Label({
      text: this._('Loading…'),
      y_expand: true,
      y_align: Clutter.ActorAlign.CENTER,
      style_class: 'ganj-panel-label',
    });
    this._indicator.add_child(this._label);

    this._poemSection = new PopupMenu.PopupMenuSection();
    this._indicator.menu.addMenuItem(this._poemSection);

    this._indicator.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

    this._openMenuItem = this._indicator.menu.addAction(this._('Open on Ganjoor'), () => {
      if (this._currentPoem?.fullUrl) {
        const uri = this._currentPoem.fullUrl.startsWith('http')
          ? this._currentPoem.fullUrl
          : `https://ganjoor.net${this._currentPoem.fullUrl}`;
        try {
          Gio.AppInfo.launch_default_for_uri(uri, null);
        } catch (error) {
          logError(error, 'Failed to open Ganjoor poem');
        }
      }
    });
    this._openMenuItem.setSensitive(false);

    this._refreshMenuItem = this._indicator.menu.addAction(this._('Load another poem'), () => {
      void this._refreshPoem();
    });

    Main.panel.addToStatusArea('ganj-poem-indicator', this._indicator);

    void this._refreshPoem();
  }

  disable() {
    if (this._indicator) {
      this._indicator.destroy();
      this._indicator = null;
    }

    this._poemSection = null;
    this._label = null;
    this._refreshMenuItem = null;
    this._openMenuItem = null;
    this._currentPoem = null;

    if (this._session) {
      this._session.abort();
      this._session = null;
    }
  }

  async _refreshPoem() {
    if (!this._session) {
      return;
    }

    this._label.text = this._('Loading…');
    this._openMenuItem?.setSensitive(false);
    this._fillPoemSection([]);

    try {
      const poem = this._mapPoemResponse(await this._requestJson('/api/ganjoor/poem/random'));
      this._currentPoem = poem;
      this._label.text = poem.poet ? `${poem.poet} — ${poem.title}` : poem.title;
      this._openMenuItem?.setSensitive(Boolean(poem.fullUrl));
      this._fillPoemSection(poem.plainText.split('\n').map((line) => line.trim()).filter(Boolean), poem.fullTitle);
    } catch (error) {
      const message = error instanceof Error ? error.message : `${error}`;
      this._label.text = this._('Error');
      this._fillPoemSection([message]);
    }
  }

  _fillPoemSection(lines, title = null) {
    if (!this._poemSection) {
      return;
    }

    this._poemSection.removeAll();

    if (title) {
      const titleItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
      titleItem.add_child(
        new St.Label({
          text: title,
          style_class: 'ganj-poem-title',
          x_align: Clutter.ActorAlign.START,
          y_align: Clutter.ActorAlign.START,
        }),
      );
      this._poemSection.addMenuItem(titleItem);
    }

    for (const line of lines) {
      const verseItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
      verseItem.add_child(
        new St.Label({
          text: line,
          style_class: 'ganj-poem-verse',
          x_align: Clutter.ActorAlign.START,
          y_align: Clutter.ActorAlign.START,
        }),
      );
      this._poemSection.addMenuItem(verseItem);
    }
  }

  async _requestJson(path) {
    if (!this._session) {
      throw new Error(this._('Network session is not available.'));
    }

    const uri = `${API_BASE_URL}${path}`;
    const message = Soup.Message.new('GET', uri);
    message.request_headers.append('Accept', 'application/json');

    const bytes = await this._session.send_and_read_async(message, GLib.PRIORITY_DEFAULT, null);
    const status = message.get_status();
    if (status < 200 || status >= 300) {
      throw new Error(this._('Unable to download poem.')); 
    }

    const decoder = new TextDecoder('utf-8');
    try {
      return JSON.parse(decoder.decode(bytes.get_data()));
    } catch (error) {
      throw new Error(this._('Received an invalid response from Ganjoor.'));
    }
  }

  _mapPoemResponse(data) {
    if (!data || !data.id) {
      throw new Error(this._('Poem data was not received.'));
    }

    const plainText = data.htmlText ? this._cleanHtml(data.htmlText) : data.plainText ?? '';
    const fullTitle = data.fullTitle ?? '';
    const fullUrl = data.fullUrl ?? '';

    return {
      id: data.id,
      title: data.title ?? this._('Untitled'),
      fullTitle,
      fullUrl,
      poet: this._getPoetName(fullTitle),
      plainText,
    };
  }

  _cleanHtml(htmlText) {
    return htmlText
      .replace(/<div[^>]*class="([^"]*)"[^>]*>/g, '')
      .replace(/<\/div>/g, '')
      .replace(/<p[^>]*>/g, '')
      .replace(/<\/p>/g, '\n')
      .replace(/<br\s*\/?\s*>/g, '\n')
      .replace(/\n{2,}/g, '\n')
      .trim();
  }

  _getPoetName(fullTitle) {
    if (!fullTitle) {
      return '';
    }

    const parts = fullTitle.split(' » ');
    return parts[0] ?? '';
  }
}
