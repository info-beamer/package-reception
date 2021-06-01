'use strict';

function deepcopy(o) {
  return JSON.parse(JSON.stringify(o))
}

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
    init(state, {assets, node_assets, config}) {
      state.assets = assets;
      state.node_assets = node_assets;
      state.config = config;
    },
    assets_update(state, assets) {
      state.assets = assets;
    },
    remove_page(state, index) {
      state.config.pages.splice(index, 1);
    },
    create_page(state, index) {
      var new_page = {
        media: "empty.png",
        layout: "fullscreen",
        duration: "auto",
        config: {},
        schedule: {
          hours: [],
        }
      }
      if (index != -1) {
        var last_page = state.config.pages[index];
        new_page.media = last_page.media;
        new_page.layout = last_page.layout;
        new_page.duration = last_page.duration;
        new_page.config = deepcopy(last_page.config);
        state.config.pages.splice(index+1, 0, new_page);
      } else {
        state.config.pages.splice(0, 0, new_page);
      }
    },
    create_pages(state, opt) {
      var last_page = state.config.pages[opt.index];
      for (var i = 0; i < opt.selected.length; i++) {
        var select = opt.selected[i];
        var new_page = {
          media: select.id,
          layout: "fullscreen",
          duration: last_page.duration,
          config: {},
          schedule: {
            hours: [],
          }
        }
        state.config.pages.splice(opt.index+i+1, 0, new_page);
      }
    },
    set_option(state, {key, value}) {
      Vue.set(state.config, key, value);
    },
    set_layout(state, {index, layout}) {
      state.config.pages[index].layout = layout;
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
    init(context, values) {
      context.commit('init', values);
    },
    remove_page(context, index) {
      context.commit('remove_page', index);
    },
    create_page(context, index) {
      context.commit('create_page', index);
    },
    create_pages(context, opt) {
      context.commit('create_pages', opt);
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
    time_fmt: {
      get() {
        return this.config.time_fmt;
      },
      set(value) {
        this.$store.dispatch('set_option', {key: 'time_fmt', value: value});
      },
    },
    language: {
      get() {
        return this.config.language || 'en';
      },
      set(value) {
        this.$store.dispatch('set_option', {key: 'language', value: value});
      },
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
    onAddMultiple(index) {
      var that = this;
      ib.assetChooser({
        selected_asset_spec: this.asset_spec,
        valid: ['image', 'video'],
        features: ['image2k', 'h264'],
        multi_select: true,
      }).then(function(selected) {
        if (selected) {
          that.$store.dispatch('create_pages', {
            index: index,
            selected: selected,
          })
        }
      })
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
    durations: [{
      key: "auto", value: "Automatic",
    }, {
      key: "5", value: "5 seconds",
    }, {
      key: "10", value: "10 seconds",
    }, {
      key: "15", value: "15 seconds",
    }, {
      key: "20", value: "20 seconds",
    }, {
      key: "60", value: "1 minute",
    }, {
      key: "120", value: "2 minutes",
    }, {
      key: "180", value: "3 minutes",
    }]
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
  methods: {
    onOpen() {
      var that = this;
      ib.assetChooser({
        selected_asset_spec: this.asset_spec,
        filter: this.valid.split(','),
        features: ['image2k', 'h264'],
      }).then(function(selected) {
        selected && that.$emit('assetSelected', selected.id);
      })
    },
  }
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
      this.$emit('scheduleUpdated', index, this.set);
    },
    onEditStop() {
      this.edit = false;
    },
    onToggleDay(day, on) {
      var offset = day * 24;
      for (var i = 0; i < 24; i++) {
        this.$emit('scheduleUpdated', offset+i, on);
      }
    },
    onEditToggle(index) {
      if (this.edit) {
        this.$emit('scheduleUpdated', index, this.set);
      }
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
  ib.onAssetUpdate(() => {
    console.log("assets updated")
    store.commit('assets_update', ib.assets)
  })
  store.dispatch('init', {
    assets: ib.assets,
    node_assets: ib.node_assets,
    config: ib.config,
  })
  store.subscribe((mutation, state) => {
    ib.setConfig(state.config);
  })
})
