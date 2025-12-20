local wezterm = require 'wezterm'
local config = wezterm.config_builder()

-- window
config.initial_cols = 70
config.initial_rows = 25
config.window_padding = {
    left = 0,
    right = 0,
    top = 0,
    bottom = 0
}
-- TODO: dim window for non-active windows
border_width = '0.1cell'
border_color = '#c4d472'
config.window_frame = {
    border_left_width = border_width,
    border_right_width = border_width,
    border_bottom_height = border_width,
    border_top_height = border_width,
    border_left_color = border_color,
    border_right_color = border_color,
    border_bottom_color = border_color,
    border_top_color = border_color
}
config.window_decorations = 'RESIZE'
config.hide_tab_bar_if_only_one_tab = true
config.inactive_pane_hsb = {
    saturation = 0.9,
    brightness = 0.8
}

-- cursor
config.default_cursor_style = 'SteadyUnderline'

-- scrollback
config.scrollback_lines = 500000

-- font
config.font = wezterm.font 'Juisee NF'
config.font_size = 11.5

-- colors
config.window_background_opacity = 0.8
config.colors = {
    background = '#232323',
    -- based on Iceberg - https://github.com/cocopon/iceberg.vim
    foreground = '#c6c8d1',
    cursor_bg = '#d2d4de',
    ansi = {'#161821', '#e27878', '#b4be82', '#e2a478', '#84a0c6', '#a093c7', '#89b8c2', '#c6c8d1'},
    brights = {'#6b7089', '#e98989', '#c0ca8e', '#e9b189', '#91acd1', '#ada0d3', '#95c4ce', '#d2d4de'}
}

-- keys
config.keys = {{
    key = "F11",
    action = wezterm.action_callback(function(window)
        local old_dim = window:get_dimensions()
        window:maximize()
        local new_dim = window:get_dimensions()
        if (old_dim.pixel_width == new_dim.pixel_width) and (old_dim.pixel_height == new_dim.pixel_height) then
            window:restore()
        end
    end)
}}

return config
