'use strict';

const store = new Vuex.Store({
  strict: true,
  state: {
    assets: {},
    node_assets: {},
    config: {
      pages: [],
    },
  },
  mutations: {
    init (state, {assets, node_assets, config}) {
      state.assets = assets;
      state.node_assets = node_assets;
      state.config = config;
    },
    remove_page (state, index) {
      state.config.pages.splice(index, 1);
    },
    create_page (state, index) {
      var new_page = {
        media: "empty.png",
        layout: "fullscreen",
        config: {},
        schedule: {
          hours: [],
        },
        interaction: {
          key: '',
          title: '',
          duration: 'auto',
        },
      }
      if (index != -1) {
        var last_page = state.config.pages[index];
        new_page.media = last_page.media;
        new_page.layout = last_page.layout;
        state.config.pages.splice(index+1, 0, new_page);
      } else {
        state.config.pages.splice(0, 0, new_page);
      }
    },
    set_option(state, {key, value}) {
      Vue.set(state.config, key, value);
    },
    set_layout(state, {index, layout}) {
      state.config.pages[index].layout = layout;
    },
    set_interaction(state, {index, interaction}) {
      state.config.pages[index].interaction = interaction;
    },
    set_schedule_hour(state, {index, hour, on}) {
      var hours = state.config.pages[index].schedule.hours;
      while (hours.length < 24*7) 
        hours.push(true);
      Vue.set(hours, hour, on);
    },
    set_media(state, {index, media}) {
      state.config.pages[index].media = media;
    },
    set_duration(state, {index, duration}) {
      state.config.pages[index].duration = duration;
    },
    set_config(state, {index, key, value}) {
      Vue.set(state.config.pages[index].config, key, value);
    },
  },

  actions: {
    init (context, values) {
      context.commit('init', values);
    },
    remove_page (context, index) {
      context.commit('remove_page', index);
    },
    create_page (context, index) {
      context.commit('create_page', index);
    },
    set_option(context, update) {
      context.commit('set_option', update);
    },
    set_layout(context, update) {
      context.commit('set_layout', update);
    },
    set_schedule_hour (context, update) {
      context.commit('set_schedule_hour', update);
    },
    set_interaction(context, update) {
      context.commit('set_interaction', update);
    },
    set_media(context, update) {
      context.commit('set_media', update);
    },
    set_duration(context, update) {
      context.commit('set_duration', update);
    },
    set_config(context, update) {
      context.commit('set_config', update);
    },
  }
})

Vue.component('config-ui', {
  template: '#config-ui',
  computed: {
    config() {
      return this.$store.state.config;
    },
    audio: {
      get() {
        return this.config.audio;
      },
      set(value) {
        this.$store.dispatch('set_option', {key: 'audio', value: value});
      },
    },
    pages() {
      return this.config.pages;
    },
  },
  methods: {
    onAdd(index) {
      this.$store.dispatch('create_page', index);
    },
    onSetConfig(key, value) {
      this.$store.dispatch('set_option', {key: key, value: value});
    },
  }
})

Vue.component('page-ui', {
  template: '#page-ui',
  props: ["page", "index"],
  data: () => ({
    open: false,
    durations: [
      {key: "auto", value: "Automatic"},
      {key: "5",    value: "5 seconds"},
      {key: "10",   value: "10 seconds"},
      {key: "15",   value: "15 seconds"},
      {key: "20",   value: "20 seconds"},
    ]
  }),
  methods: {
    onRemove() {
      this.$store.dispatch('remove_page', this.index);
    },
    onScheduleUpdate(hour, on) {
      this.$store.dispatch('set_schedule_hour', {
        index: this.index,
        hour: hour,
        on: on,
      });
    },
    onInteractionUpdate(interaction) {
      this.$store.dispatch('set_interaction', {
        index: this.index,
        interaction: interaction,
      });
    },
    onLayoutSelected(layout) {
      this.$store.dispatch('set_layout', {
        index: this.index,
        layout: layout
      });
    },
    onConfigUpdate(key, value) {
      this.$store.dispatch('set_config', {
        index: this.index,
        key: key,
        value: value,
      });
    },
    onDurationChange(evt) {
      this.$store.dispatch('set_duration', {
        index: this.index,
        duration: evt.target.value,
      });
    },
    onMediaUpdate(asset_spec) {
      this.$store.dispatch('set_media', {
        index: this.index,
        media: asset_spec,
      });
    },
    onToggleOpen() {
      this.open = !this.open;
    },
  }
})

Vue.component('page-fullscreen', {
  template: '#page-fullscreen',
  props: ["page"],
  methods: {
    onAssetSelected(asset_spec) {
      this.$emit('mediaUpdated', asset_spec);
    },
  }
})

Vue.component('page-text-right', {
  template: '#page-text-right',
  props: ["page"],
  methods: {
    onAssetSelected(asset_spec) {
      this.$emit('mediaUpdated', asset_spec);
    },
    onUpdateForeground(evt) {
      this.$emit('configUpdated', 'foreground', evt.target.value);
    },
    onUpdateBackground(evt) {
      this.$emit('configUpdated', 'background', evt.target.value);
    },
    onUpdateTitle(evt) {
      this.$emit('configUpdated', 'title', evt.target.value);
    },
    onUpdateKenBurns(evt) {
      this.$emit('configUpdated', 'kenburns', evt.target.checked);
    },
    onUpdateText(evt) {
      this.$emit('configUpdated', 'text', evt.target.value);
    },
  }
})

Vue.component('page-text-left', {
  template: '#page-text-left',
  props: ["page"],
  methods: {
    onAssetSelected(asset_spec) {
      this.$emit('mediaUpdated', asset_spec);
    },
    onUpdateForeground(evt) {
      this.$emit('configUpdated', 'foreground', evt.target.value);
    },
    onUpdateBackground(evt) {
      this.$emit('configUpdated', 'background', evt.target.value);
    },
    onUpdateTitle(evt) {
      this.$emit('configUpdated', 'title', evt.target.value);
    },
    onUpdateKenBurns(evt) {
      this.$emit('configUpdated', 'kenburns', evt.target.checked);
    },
    onUpdateText(evt) {
      this.$emit('configUpdated', 'text', evt.target.value);
    },
  }
})

Vue.component('asset-view', {
  template: '#asset-view',
  props: ["asset_spec", "width", "height", "shadow"],
  computed: {
    asset_info() {
      var assets = this.$store.state.assets;
      var node_assets = this.$store.state.node_assets;
      return assets[this.asset_spec] || node_assets[this.asset_spec];
    },
    thumb_url() {
      var info = this.asset_info;
      var w = this.width || 256;
      var h = this.height || 256;
      var max = Math.max(w, h);
      var scale = 1.0;
      if (max > 512) {
        scale = 512 / max;
      }
      w = Math.ceil(w * scale);
      h = Math.ceil(h * scale);
      return info.thumb + '?w=' + w + '&h=' + h + '&crop=none';
    }
  },
})

Vue.component('asset-browser', {
  template: '#asset-browser',
  props: ["asset_spec", "valid", "title", "help"],
  data: () => ({
    sorted: "filename",
    open: false,
    highlight: undefined,
    search: "",
    top: 0,
  }),
  computed: {
    info() {
      if (this.highlight == undefined) {
        return "Click to select an asset";
      } else {
        return this.highlight.filename + " (" + this.highlight.filetype + ")";
      }
    },
    assets() {
      var valid = {};
      for (var v of this.valid.split(",")) {
        valid[v] = true;
      }
      var all_assets = [];
      function add_all(assets) {
        for (var asset_id in assets) {
          var asset = assets[asset_id];
          if (valid[asset.filetype]) {
            all_assets.push({
              id: asset.id,
              thumb: asset.thumb,
              filename: asset.filename,
              filetype: asset.filetype,
              uploaded: asset.uploaded || 0,
            })
          }
        }
      }
      add_all(this.$store.state.assets);
      add_all(this.$store.state.node_assets);
      all_assets.sort({
        filename: function(a, b) {
          var fa = a.filename.toLocaleLowerCase();
          var fb = b.filename.toLocaleLowerCase();
          return fa.localeCompare(fb)
        },
        age: function(a, b) { 
          return a.uploaded - b.uploaded
        },
      }[this.sorted]);
      return all_assets;
    }
  },
  methods: {
    onToggleOpen(evt) {
      this.open = !this.open;
      this.top = evt.target.getBoundingClientRect().bottom;
    },
    onClose() {
      this.open = false;
    },
    onSort(sorted) {
      this.sorted = sorted;
    },
    onSelect(asset_spec) {
      this.$emit('assetSelected', asset_spec);
      this.open = false;
    },
    onHighlight(asset_spec) {
      this.highlight = this.$store.state.assets[asset_spec] || 
                       this.$store.state.node_assets[asset_spec];
    }
  },
})

Vue.component('schedule-ui', {
  template: '#schedule-ui',
  props: ['schedule'],
  data: () => ({
    edit: false,
    set: false,
  }),
  computed: {
    schedule_ui() {
      var days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      var ui = [];
      for (var day = 0; day < 7; day++) {
        var hours = []
        var num_on = 0;
        for (var hour = 0; hour < 24; hour++) {
          var index = day * 24 + hour;
          var on = this.schedule.hours[index];
          if (on == undefined)
            on = true;
          if (on)
            num_on++;
          hours.push({
            on: on,
            hour: hour,
            index: index,
          })
        }
        ui.push({
          name: days[day],
          day: day,
          toggle: num_on < 12,
          hours: hours,
        })
      }
      return ui;
    }
  },
  methods: {
    onEditStart(index) {
      this.edit = true;
      var on = this.schedule.hours[index];
      if (on == undefined)
        on = true;
      this.set = !on;
      this.$emit('onChange', index, this.set);
    },
    onEditStop() {
      this.edit = false;
    },
    onToggleDay(day, on) {
      var offset = day * 24;
      for (var i = 0; i < 24; i++) {
        this.$emit('onChange', offset+i, on);
      }
    },
    onEditToggle(index) {
      if (this.edit) {
        this.$emit('onChange', index, this.set);
      }
    },
  }
})

Vue.component('interaction-ui', {
  template: '#interaction-ui',
  props: ['interaction'],
  data: () => ({
    keys: [
      {key: "", value: "(no key trigger)"},
      {key: "a", value: "key 'A'"},
      {key: "b", value: "key 'B'"},
      {key: "c", value: "key 'C'"},
      {key: "d", value: "key 'D'"},
      {key: "e", value: "key 'E'"},
      {key: "f", value: "key 'F'"},
      {key: "g", value: "key 'G'"},
      {key: "h", value: "key 'H'"},
      {key: "i", value: "key 'I'"},
      {key: "j", value: "key 'J'"},
      {key: "k", value: "key 'K'"},
      {key: "l", value: "key 'L'"},
      {key: "m", value: "key 'M'"},
      {key: "n", value: "key 'N'"},
      {key: "o", value: "key 'O'"},
      {key: "p", value: "key 'P'"},
      {key: "q", value: "key 'Q'"},
      {key: "r", value: "key 'R'"},
      {key: "s", value: "key 'S'"},
      {key: "t", value: "key 'T'"},
      {key: "u", value: "key 'U'"},
      {key: "v", value: "key 'V'"},
      {key: "w", value: "key 'W'"},
      {key: "x", value: "key 'X'"},
      {key: "y", value: "key 'Y'"},
      {key: "z", value: "key 'Z'"},

      {key: "0", value: "key '0'"},
      {key: "1", value: "key '1'"},
      {key: "2", value: "key '2'"},
      {key: "3", value: "key '3'"},
      {key: "4", value: "key '4'"},
      {key: "5", value: "key '5'"},
      {key: "6", value: "key '6'"},
      {key: "7", value: "key '7'"},
      {key: "8", value: "key '8'"},
      {key: "9", value: "key '9'"},

      {key: "kp0", value: "numpad 0"},
      {key: "kp1", value: "numpad 1"},
      {key: "kp2", value: "numpad 2"},
      {key: "kp3", value: "numpad 3"},
      {key: "kp4", value: "numpad 4"},
      {key: "kp5", value: "numpad 5"},
      {key: "kp6", value: "numpad 6"},
      {key: "kp7", value: "numpad 7"},
      {key: "kp8", value: "numpad 8"},
      {key: "kp9", value: "numpad 9"},

      {key: "f1", value: "F1"},
      {key: "f2", value: "F2"},
      {key: "f3", value: "F3"},
      {key: "f4", value: "F4"},
      {key: "f5", value: "F5"},
      {key: "f6", value: "F6"},
      {key: "f7", value: "F7"},
      {key: "f8", value: "F8"},
      {key: "f9", value: "F9"},
      {key: "f10",value: "F10"},
      {key: "f11",value: "F11"},
      {key: "f12",value: "F12"},
    ],
    durations: [
      {key: "auto",    value: "as configured"},
      {key: "forever", value: "forever"},
    ],
  }),
  methods: {
    onSelectKey(evt) {
      this.$emit('onChange', Object.assign({}, this.interaction, {
        key: evt.target.value
      }));
    },
    onSelectDuration(evt) {
      this.$emit('onChange', Object.assign({}, this.interaction, {
        duration: evt.target.value
      }));
    },
    onTitle(evt) {
      this.$emit('onChange', Object.assign({}, this.interaction, {
        title: evt.target.value
      }));
    },
  }
})

Vue.component('layout-select', {
  template: '#layout-select',
  props: ['layout'],
  data: () => ({
    options: [{
      value: "fullscreen",
      text: "Fullscreen",
    }, {
      value: "text-left",
      text: "Text on left side",
    }, {
      value: "text-right",
      text: "Text on right side",
    }]
  }),
  methods: {
    onSelect(evt) {
      this.$emit('layoutSelected', evt.target.value);
    },
  }
})

Vue.component('timezone-select', {
  template: '#timezone-select',
  props: ['timezone'],
  data: () => ({
    timezones: TIMEZONES,
  }),
  methods: {
    onSelect(evt) {
      this.$emit('timezoneSelected', evt.target.value);
    },
  }
})



const app = new Vue({
  el: "#app",
  store,
})

ib.setDefaultStyle();
ib.ready.then(() => {
  store.dispatch('init', {
    assets: ib.assets,
    node_assets: ib.node_assets,
    config: ib.config,
  })
  store.subscribe((mutation, state) => {
    ib.setConfig(state.config);
  })
})
