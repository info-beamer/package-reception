gl.setup(NATIVE_WIDTH, NATIVE_HEIGHT)

node.alias "*" -- catch all communication

util.noglobals()

local json = require "json"
local easing = require "easing"
local loader = require "loader"

local min, max, abs, floor = math.min, math.max, math.abs, math.floor

local IDLE_ASSET = "empty.png"

local node_config = {}

local overlay_debug = false
local font_regl = resource.load_font "default-font.ttf"
local font_bold = resource.load_font "default-font-bold.ttf"

local overlays = {
    resource.create_colored_texture(1,0,0),
    resource.create_colored_texture(0,1,0),
    resource.create_colored_texture(0,0,1),
    resource.create_colored_texture(1,0,1),
    resource.create_colored_texture(1,1,0),
    resource.create_colored_texture(0,1,1),
}

local function in_epsilon(a, b, e)
    return abs(a - b) <= e
end

local function ramp(t_s, t_e, t_c, ramp_time)
    if ramp_time == 0 then return 1 end
    local delta_s = t_c - t_s
    local delta_e = t_e - t_c
    return min(1, delta_s * 1/ramp_time, delta_e * 1/ramp_time)
end

local function wait_frame()
    return coroutine.yield(true)
end

local function wait_t(t)
    while true do
        local now = wait_frame()
        if now >= t then
            return now
        end
    end
end

local function from_to(starts, ends)
    return function()
        local now, x1, y1, x2, y2
        while true do
            now, x1, y1, x2, y2 = wait_frame()
            if now >= starts then
                break
            end
        end
        if now < ends then
            return now, x1, y1, x2, y2
        end
    end
end


local function mktween(fn)
    return function(sx1, sy1, sx2, sy2, ex1, ey1, ex2, ey2, progress)
        return fn(progress, sx1, ex1-sx1, 1),
               fn(progress, sy1, ey1-sy1, 1),
               fn(progress, sx2, ex2-sx2, 1),
               fn(progress, sy2, ey2-sy2, 1)
    end
end

local movements = {
    linear = mktween(easing.linear),
    smooth = mktween(easing.inOutQuint),
}

local function trim(s)
    return s:match "^%s*(.-)%s*$"
end

local function split(str, delim)
    local result, pat, last = {}, "(.-)" .. delim .. "()", 1
    for part, pos in string.gmatch(str, pat) do
        result[#result+1] = part
        last = pos
    end
    result[#result+1] = string.sub(str, last)
    return result
end

local function wrap(str, limit, indent, indent1)
    limit = limit or 72
    local here = 1
    local wrapped = str:gsub("(%s+)()(%S+)()", function(sp, st, word, fi)
        if fi-here > limit then
            here = st
            return "\n"..word
        end
    end)
    local splitted = {}
    for token in string.gmatch(wrapped, "[^\n]+") do
        splitted[#splitted + 1] = token 
    end
    return splitted
end 

local function Clock()
    local base_day = 0
    local base_week = 0
    local human_time = ""
    local unix_diff = 0

    util.data_mapper{
        ["clock/since_midnight"] = function(since_midnight)
            base_day = tonumber(since_midnight) - sys.now()
        end;
        ["clock/since_monday"] = function(since_monday)
            base_week = tonumber(since_monday) - sys.now()
        end;
        ["clock/human"] = function(time)
            human_time = time
        end;
    }

    local function day_of_week()
        return math.floor((base_week + sys.now()) / 86400)
    end

    local function hour_of_week()
        return math.floor((base_week + sys.now()) / 3600)
    end

    local function human()
        return human_time
    end

    local function unix()
        local now = sys.now()
        if now == 0 then
            return os.time()
        end
        if unix_diff == 0 then
            local ts = os.time()
            if ts > 1000000 then
                unix_diff = ts - sys.now()
            end
        end
        return now + unix_diff
    end

    return {
        day_of_week = day_of_week;
        hour_of_week = hour_of_week;
        human = human;
        unix = unix;
    }
end

local clock = Clock()

local SharedData = function()
    -- {
    --    scope: { key: data }
    -- }
    local data = {}

    -- {
    --    key: { scope: listener }
    -- }
    local listeners = {}

    local function call_listener(scope, listener, key, value)
        local ok, err = xpcall(listener, debug.traceback, scope, value)
        if not ok then
            print("while calling listener for key " .. key .. ":" .. err)
        end
    end

    local function call_listeners(scope, key, value)
        local key_listeners = listeners[key]
        if not key_listeners then
            return
        end

        for _, listener in pairs(key_listeners) do
            call_listener(scope, listener, key, value)
        end
    end

    local function update(scope, key, value)
        if not data[scope] then
            data[scope] = {}
        end
        data[scope][key] = value
        if value == nil and not next(data[scope]) then
            data[scope] = nil
        end
        return call_listeners(scope, key, value)
    end

    local function delete(scope, key)
        return update(scope, key, nil)
    end

    local function add_listener(scope, key, listener)
        local key_listeners = listeners[key]
        if not key_listeners then
            listeners[key] = {}
            key_listeners = listeners[key]
        end
        if key_listeners[scope] then
            error "right now only a single listener is supported per scope"
        end
        key_listeners[scope] = listener
        for scope, scoped_data in pairs(data) do
            for key, value in pairs(scoped_data) do
                call_listener(scope, listener, key, value)
            end
        end
    end

    local function del_scope(scope)
        for key, key_listeners in pairs(listeners) do
            key_listeners[scope] = nil
            if not next(key_listeners) then
                listeners[key] = nil
            end
        end

        local scoped_data = data[scope]
        if scoped_data then
            for key, value in pairs(scoped_data) do
                delete(scope, key)
            end
        end
        data[scope] = nil
    end

    return {
        update = update;
        delete = delete;
        add_listener = add_listener;
        del_scope = del_scope;
    }
end

local data = SharedData()

local tiles = loader.setup "tile.lua"
tiles.make_api = function(tile)
    return {
        wait_frame = wait_frame,
        wait_t = wait_t,
        from_to = from_to,

        clock = clock,

        update_data = function(key, value)
            data.update(tile, key, value)
            data.delete(tile, key)
        end,
        add_listener = function(key, listener)
            data.add_listener(tile, key, listener)
        end,
    }
end

node.event("module_unload", function(tile)
    data.del_scope(tile)
end)

local function TileChild(config)
    return function(starts, ends)
        local tile = tiles.modules[config.asset_name]
        return tile.task(starts, ends, config)
    end
end

local kenburns_shader = resource.create_shader[[
    uniform sampler2D Texture;
    varying vec2 TexCoord;
    uniform vec4 Color;
    uniform float x, y, s;
    void main() {
        gl_FragColor = texture2D(Texture, TexCoord * vec2(s, s) + vec2(x, y)) * Color;
    }
]]

local function Image(config)
    -- config:
    --   asset_name: 'foo.jpg'
    --   kenburns: true/false
    --   fade_time: 0-1
    --   fit: true/false

    local file = resource.open_file(config.asset_name)

    return function(starts, ends)
        wait_t(starts - 2)

        local img = resource.load_image(file)

        local fade_time = config.fade_time or 0.5

        if config.kenburns then
            local function lerp(s, e, t)
                return s + t * (e-s)
            end

            local paths = {
                {from = {x=0.0,  y=0.0,  s=1.0 }, to = {x=0.08, y=0.08, s=0.9 }},
                {from = {x=0.05, y=0.0,  s=0.93}, to = {x=0.03, y=0.03, s=0.97}},
                {from = {x=0.02, y=0.05, s=0.91}, to = {x=0.01, y=0.05, s=0.95}},
                {from = {x=0.07, y=0.05, s=0.91}, to = {x=0.04, y=0.03, s=0.95}},
            }

            local path = paths[math.random(1, #paths)]

            local to, from = path.to, path.from
            if math.random() >= 0.5 then
                to, from = from, to
            end

            local w, h = img:size()
            local duration = ends - starts
            local linear = easing.linear

            local function lerp(s, e, t)
                return s + t * (e-s)
            end

            for now, x1, y1, x2, y2 in from_to(starts, ends) do
                local t = (now - starts) / duration
                kenburns_shader:use{
                    x = lerp(from.x, to.x, t);
                    y = lerp(from.y, to.y, t);
                    s = lerp(from.s, to.s, t);
                }
                if config.fit then
                    util.draw_correct(img, x1, y1, x2, y2, ramp(
                        starts, ends, now, fade_time
                    ))
                else
                    img:draw(x1, y1, x2, y2, ramp(
                        starts, ends, now, fade_time
                    ))
                end
                kenburns_shader:deactivate()
            end
        else
            for now, x1, y1, x2, y2 in from_to(starts, ends) do
                if config.fit then
                    util.draw_correct(img, x1, y1, x2, y2, ramp(
                        starts, ends, now, fade_time
                    ))
                else
                    img:draw(x1, y1, x2, y2, ramp(
                        starts, ends, now, fade_time
                    ))
                end
            end
        end
        img:dispose()
    end
end

local function Idle(config)
    return function() end;
end

local function Video(config)
    -- config:
    --   asset_name: 'foo.mp4'
    --   fit: aspect fit or scale?
    --   fade_time: 0-1
    --   raw: use raw video?
    --   layer: video layer for raw videos

    local file = resource.open_file(config.asset_name)

    return function(starts, ends)
        wait_t(starts - 1)

        local fade_time = config.fade_time or 0.5

        local vid
        if config.raw then
            local raw = sys.get_ext "raw_video"
            vid = raw.load_video{
                file = file,
                paused = true,
                audio = node_config.audio,
            }
            vid:layer(-10)

            for now, x1, y1, x2, y2 in from_to(starts, ends) do
                vid:layer(config.layer or 5):start()
                vid:target(x1, y1, x2, y2):alpha(ramp(
                    starts, ends, now, fade_time
                ))
            end
        else
            vid = resource.load_video{
                file = file,
                paused = true,
                audio = node_config.audio,
            }

            for now, x1, y1, x2, y2 in from_to(starts, ends) do
                vid:start()
                if config.fit then
                    util.draw_correct(vid, x1, y1, x2, y2, ramp(
                        starts, ends, now, fade_time
                    ))
                else
                    vid:draw(x1, y1, x2, y2, ramp(
                        starts, ends, now, fade_time
                    ))
                end
            end
        end

        vid:dispose()
    end
end

local function Flat(config)
    -- config:
    --   color: "#rrggbb"
    --   fade_time: 0-1

    local color = config.color:gsub("#","")
    local r, g, b = tonumber("0x"..color:sub(1,2))/255, tonumber("0x"..color:sub(3,4))/255, tonumber("0x"..color:sub(5,6))/255

    local flat = resource.create_colored_texture(r, g, b, 1)
    local fade_time = config.fade_time or 0.5

    return function(starts, ends)
        for now, x1, y1, x2, y2 in from_to(starts, ends) do
            flat:draw(x1, y1, x2, y2, ramp(
                starts, ends, now, fade_time
            ))
        end
        flat:dispose()
    end
end

local function TimeTile(config)
    return function(starts, ends)
        local font = config.font
        local r, g, b = config.r, config.g, config.b
        for now, x1, y1, x2, y2 in from_to(starts, ends) do
            local size = y2 - y1
            local time = clock.human()
            local w = font:width(time, size)
            local offset = ((x2 - x1) - w) / 2
            config.font:write(x1+offset,  y1+config.y, time, size, r,g,b,1)
        end
    end
end

local function Markup(config)
    local text = config.text
    local width = config.width
    local height = config.height
    local color = config.color:gsub("#","")
    local r, g, b = tonumber("0x"..color:sub(1,2))/255, tonumber("0x"..color:sub(3,4))/255, tonumber("0x"..color:sub(5,6))/255

    local y = 0
    local max_x = 0
    local writes = {}

    local CELL_PADDING = 40
    local PARAGRAPH_SPLIT = 40
    local LINE_HEIGHT = 1.05

    local DEFAULT_FONT_SIZE = 35
    local H1_FONT_SIZE = 70
    local H2_FONT_SIZE = 50

    local function max_per_line(font, size, width)
        -- try to calculate the max characters/line
        -- number based on the average character width
        -- of the specified font.
        local test_width = font:width("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz", size)
        local avg_width = test_width / 52
        local chars_per_line = width / avg_width
        return math.floor(chars_per_line)
    end

    local rows = {}
    local function flush_table()
        local max_w = {}
        for ri = 1, #rows do
            local row = rows[ri]
            for ci = 1, #row do
                local col = row[ci]
                max_w[ci] = max(max_w[ci] or 0, col.width)
            end
        end

        local TABLE_SEPARATE = 40

        for ri = 1, #rows do
            local row = rows[ri]
            local x = 0
            for ci = 1, #row do
                local col = row[ci]
                if col.text ~= "" then
                    col.x = x
                    col.y = y
                    writes[#writes+1] = col
                end
                x = x + max_w[ci]+CELL_PADDING
            end
            y = y + DEFAULT_FONT_SIZE * LINE_HEIGHT
            max_x = max(max_x, x-CELL_PADDING)
        end
        rows = {}
    end

    local function add_row()
        local cols = {}
        rows[#rows+1] = cols
        return cols
    end

    local function layout_paragraph(paragraph)
        for line in string.gmatch(paragraph, "[^\n]+") do
            local font = font_regl
            local size = DEFAULT_FONT_SIZE -- font size for line
            local maxl = max_per_line(font, size, width)

            if line:find "|" then
                -- table row
                local cols = add_row()
                for field in line:gmatch("[^|]+") do
                    field = trim(field)
                    local width = font:width(field, size)
                    cols[#cols+1] = {
                        font = font,
                        text = field,
                        size = size,
                        width = width,
                    }
                end
            else
                -- plain text, wrapped
                flush_table()

                -- markdown header # and ##
                if line:sub(1,2) == "##" then
                    line = line:sub(3)
                    font = font_bold
                    size = H2_FONT_SIZE
                    maxl = max_per_line(font, size, width)
                elseif line:sub(1,1) == "#" then
                    line = line:sub(2)
                    font = font_bold
                    size = H1_FONT_SIZE
                    maxl = max_per_line(font, size, width)
                end

                local chunks = wrap(line, maxl)
                for idx = 1, #chunks do
                    local chunk = chunks[idx]
                    chunk = trim(chunk)
                    writes[#writes+1] = {
                        font = font,
                        x = 0,
                        y = y,
                        text = chunk,
                        size = size,
                    }
                    local width = font:width(chunk, size)
                    y = y + size * LINE_HEIGHT
                    max_x = max(max_x, width)
                end
            end
        end

        flush_table()
    end

    local paragraphs = split(text, "\n\n")
    for idx = 1, #paragraphs do
        local paragraph = paragraphs[idx]
        paragraph = paragraph:gsub("\t", " ")
        layout_paragraph(paragraph)
        y = y + PARAGRAPH_SPLIT
    end

    -- remove one split
    local max_y = y - PARAGRAPH_SPLIT

    local base_x = (width-max_x) / 2
    local base_y = (height-max_y) / 2

    return function(starts, ends)
        for now, x1, y1, x2, y2 in from_to(starts, ends) do
            local x = x1 + base_x
            local y = y1 + base_y
            -- overlays[1]:draw(x, y, x+max_x, y+max_y, 0.1)
            for idx = 1, #writes do
                local w = writes[idx]
                w.font:write(x+w.x, y+w.y, w.text, w.size, r,g,b,1)
            end
        end
    end
end

local function JobQueue()
    local jobs = {}

    local function add(fn, starts, ends, coord)
        local co = coroutine.create(fn)
        local ok, again = coroutine.resume(co, starts, ends)
        if not ok then
            return error(("%s\n%s\ninside coroutine %s started by"):format(
                again, debug.traceback(job.co), job)
            )
        elseif not again then
            return
        end

        local job = {
            starts = starts,
            ends = ends,
            coord = coord,
            co = co,
        }

        jobs[#jobs+1] = job
    end

    local function tick(now)
        for idx = 1, #jobs do
            local job = jobs[idx]
            local x1, y1, x2, y2 = job.coord(job.starts, job.ends, now)

            if overlay_debug then
                overlays[(idx-1)%#overlays+1]:draw(x1, y1, x2, y2, 0.1)
            end

            local ok, again = coroutine.resume(job.co, now, x1, y1, x2, y2)
            if not ok then
                print(("%s\n%s\ninside coroutine %s resumed by"):format(
                    again, debug.traceback(job.co), job)
                )
                job.done = true
            elseif not again then
                job.done = true
            end
        end

        -- iterate backwards so we can remove finished jobs
        for idx = #jobs,1,-1 do
            local job = jobs[idx]
            if job.done then
                table.remove(jobs, idx)
            end
        end

        if #jobs == 0 then
            print "empty"
        end
    end

    return {
        tick = tick;
        add = add;
    }
end


local function Scheduler(playlist_source, job_queue)
    local global_synced = false
    local scheduled_until = clock.unix()
    local next_schedule = 0

    local TOLERANCE = 0.05
    local SCHEDULE_LOOKAHEAD = 2

    local function tick(now)
        if now < next_schedule then
            return
        end

        local playlist = playlist_source()

        -- get total playlist duration
        local total_duration = 0
        for idx = 1, #playlist do
            local item = playlist[idx]
            total_duration = max(total_duration, item.offset + item.duration)
        end

        print("playlist duration is", total_duration)

        local function enqueue(starts, item)
            local ends = starts + item.duration
            job_queue.add(item.fn, starts, ends, item.coord)
        end

        local base
        if global_synced then
            -- We're called during the current cycle (due to
            -- the SCHEDULE_LOOKAHEAD offset from the last
            -- item in the current cycle). Therefore offset
            -- by one so we have the next cycle.
            local cycle = floor(now / total_duration) + 1
            base = cycle * total_duration
        else
            base = scheduled_until
        end

        print("base unix time is", base)
            
        for idx = 1, #playlist do
            local item = playlist[idx]
            local starts = base + item.offset
            if starts >= scheduled_until - TOLERANCE then
                enqueue(starts, item)
            end
        end

        scheduled_until = base + total_duration
        next_schedule = scheduled_until - SCHEDULE_LOOKAHEAD
    end

    return {
        tick = tick;
    }
end

local function playlist()
    local playlist = {}
    local how = clock.hour_of_week()
    local offset = 0

    local function add(item)
        playlist[#playlist+1] = item
    end

    local function static(x1, y1, x2, y2)
        return function(s, e, now)
            return x1, y1, x2, y2
        end
    end

    local function tile_fullscreen(s, e, now)
        return 0, 0, WIDTH, HEIGHT-50
    end

    local function tile_top(s, e, now)
        return 0, 0, WIDTH, 100
    end

    local function tile_bottom(s, e, now)
        return 0, HEIGHT-50, WIDTH, HEIGHT
    end

    local function tile_bottom_scroller(s, e, now)
        return 300, HEIGHT-50, WIDTH, HEIGHT
    end

    local function tile_bottom_clock(s, e, now)
        return 0, HEIGHT-50, 300, HEIGHT
    end

    local function tile_right(s, e, now)
        return WIDTH/2, 100, WIDTH, HEIGHT-50
    end

    local function tile_left(s, e, now)
        return 0, 100, WIDTH/2, HEIGHT-50
    end

    local function add_info_bar(page, duration)
        add{
            offset = offset,
            duration = duration,
            fn = Image{
                fade_time = 0,
                asset_name = node_config.footer.asset_name,
            },
            coord = tile_bottom,
        }
        add{
            offset = offset,
            duration = duration,
            fn = TileChild{
                asset_name = 'scroller',
                blend = 0,
            },
            coord = tile_bottom_scroller,
        }
        add{
            offset = offset,
            duration = duration,
            fn = TimeTile{
                x = 0,
                y = 2,
                font = font_regl, 
                r = 1, g = 1, b = 1,
            },
            coord = tile_bottom_clock,
        }
    end

    local function image_or_video_player(media, kenburns)
        if media.type == "image" then
            return Image{
                fade_time = 0,
                asset_name = media.asset_name,
                kenburns = kenburns,
            }
        else
            return Video{
                fade_time = 0,
                asset_name = media.asset_name,
                raw = true,
            }
        end
    end

    local function get_duration(page)
        local duration = 10
        if page.duration == "auto" then
            if page.media.metadata.duration then
                duration = tonumber(page.media.metadata.duration)
            end
        else
            duration = tonumber(page.duration)
        end
        return duration
    end

    local function page_fullscreen(page) 
        local duration = get_duration(page)
        add{
            offset = offset,
            duration = duration,
            fn = image_or_video_player(page.media),
            coord = tile_fullscreen,
        }
        add_info_bar(page, duration)
        offset = offset + duration
    end

    local function page_text_left(page)
        local duration = get_duration(page)
        add{
            offset = offset,
            duration = duration,
            fn = Image{
                fade_time = 0,
                asset_name = node_config.header.asset_name,
            },
            coord = tile_top,
        }
        add{
            offset = offset,
            duration = duration,
            fn = image_or_video_player(page.media, page.config.kenburns),
            coord = tile_right,
        }
        add{
            offset = offset,
            duration = duration,
            fn = Flat{
                fade_time = 0,
                color = page.config.background or "#000000",
            },
            coord = tile_left,
        }
        add{
            offset = offset,
            duration = duration,
            fn = Markup{
                text = page.config.text or "",
                width = WIDTH/2,
                height = HEIGHT-200,
                color = page.config.foreground or "#ffffff",
            },
            coord = tile_left,
        }
        add_info_bar(page, duration)
        offset = offset + duration
    end

    local function page_text_right(page)
        local duration = get_duration(page)
        add{
            offset = offset,
            duration = duration,
            fn = Image{
                fade_time = 0,
                asset_name = node_config.header.asset_name,
            },
            coord = tile_top,
        }
        add{
            offset = offset,
            duration = duration,
            fn = image_or_video_player(page.media, page.config.kenburns),
            coord = tile_left,
        }
        add{
            offset = offset,
            duration = duration,
            fn = Flat{
                fade_time = 0,
                color = page.config.background or "#000000",
            },
            coord = tile_right,
        }
        add{
            offset = offset,
            duration = duration,
            fn = Markup{
                text = page.config.text or "",
                width = WIDTH/2,
                height = HEIGHT-200,
                color = page.config.foreground or "#ffffff",
            },
            coord = tile_right,
        }
        add_info_bar(page, duration)
        offset = offset + duration
    end

    local layouts = {
        ["fullscreen"] = page_fullscreen;
        ["text-left"] = page_text_left;
        ["text-right"] = page_text_right;
    }

    for idx = 1, #node_config.pages do
        local page = node_config.pages[idx]
        -- hours might be empty, in which case the hour
        -- should default to true. So explicitly test
        -- for unscheduled hours.
        if page.schedule.hours[how+1] == false then
            print("page ", idx, "not scheduled")
        else
            layouts[page.layout](page)
        end
    end

    -- pp(playlist)

    return playlist
end

local job_queue = JobQueue()
local scheduler = Scheduler(playlist, job_queue)

util.file_watch("config.json", function(raw)
    node_config = json.decode(raw)
end)

function node.render()
    gl.clear(0, 0, 0, 1)
    local now = clock.unix()
    scheduler.tick(now)

    local fov = math.atan2(HEIGHT, WIDTH*2) * 360 / math.pi
    gl.perspective(fov, WIDTH/2, HEIGHT/2, -WIDTH,
                        WIDTH/2, HEIGHT/2, 0)
    job_queue.tick(now)
end
