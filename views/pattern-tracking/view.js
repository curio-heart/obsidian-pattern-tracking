/**
 * Pattern Tracking v0.2.0
 * Automated tracking for story progress based on location and link data.
 */

/* Using directly inside a `dataviewjs` block?
 *  Uncomment this section and replace the data with what you need!
 */
// const input = {
//   filter: '-"~META"',
//   typekey: 'Type',
//   type: 'story',
//   subtypekey: 'Subtype',
//   subtypes: ['side-story', 'thought']
// }
  
 class Pattern {
  constructor(_filterString, _typeKey, _type, _subtypeKey, _subtypes) {
    this._m = {
      filter: _filterString,
      typeKey: _typeKey,
      type: _type,
      subtypeKey: _subtypeKey,
      subtypes: _subtypes
    }
    
    this.ALL = dv.pages(this._m.filter).where(s => s[this._m.typeKey] === this._m.type)
    if (this._m.subtypeKey) {
      this.primary = this.ALL.where(s => s[this._m.subtypeKey] == null)
      for (let subtype of this._m.subtypes) {
        this[subtype] = this.ALL.where(s => s[this._m.subtypeKey] === subtype)
      }
    }
  }
  
  /**
  * Sets needed metadata for the dataset.
  */
  prep = () => {
    for (let page of this.ALL) {
      this.setConnections(page)
      this.setWaitingTime(page)
    }
  }
  
  /**
  * Gets all pages of a give subtype, or all files if none is given.
  * @param {string} _subtype The subtype to check for; default `primary`. Accepts 'ALL' to indicate all files.
  * @returns {DataviewDataArray} of files matching the selected type, or `-1` if no files match.
  */
  getFilesOfType(_subtype) {
    const type = _subtype != null ? _subtype : 'primary'
    return this[type]
  }
  
  /**
  * Checks if a given page has connections of any subtypes.
  * @param {Page} _page The page to check
  * @param {Array<string>} _subtypes (optional) Which subtypes to check, or all if not provided
  * @returns `true` if the story contains at least one of any subtypes provided, or false otherwise.
  */
  hasConnections(_page, _subtypes) {
    let c = _page.connections
    if (!c) return false
    
    let hasAny = false

    let subtypes = _subtypes ? _subtypes : this._m.subtypes
    
    for (let st of subtypes) {
      hasAny = c[st].size ? c[st].size > 0 : false
      
      if (hasAny) break
    }
    return hasAny
  }
  
  /**
  * Merges connections from a child file to a parent file for tracking.
  * @param {Page} _dest Destination data
  * @param {Page} _src Source data
  */
  mergeConnections(_dest, _src) {
    for (let st of this._m.subtypes) {
      if (_src.connections[st].size > 0) {
        _src.connections[st].forEach(s => _dest.connections[st].add(s))
      }
    }
  }
  
  /**
  * Set connections in hidden page metadata
  * @param {Page} _file Page to gather connections for
  * @param {Page} _parent (optional) Parent page to prevent shallow recursion
  */
  setConnections(_file, _parent) {
    if (!_file.connections) {
      _file.connections = {}
      for (let st of this._m.subtypes) {
        _file.connections[st] = new Set()
      }
    }
  
    for (let f of _file.file.outlinks) {
      let p = dv.page(f)
      
      // check each linked page for page.Subtype to be `side-story` or `thought`
      for (let st of this._m.subtypes) {
        if (p.Subtype === st) _file.connections[st].add(f)
      }
      if (p.outlinks != null && p.outlinks !== []) {
        this.setConnections(p, _file)
        this.mergeConnections(_file, p)
      }
    }
  }
  
  setWaitingTime(_file) {
    let today = moment()
    let mod = moment(_file.file.mtime.toISODate())
    if (this.getStatus(_file) != 'done') {
      _file.waitTime = Math.floor(today.diff(mod, 'days', true))
    } else {
      _file.waitTime = 0
    }
  }
  
  /**
  * Get the number of days that a file has been left alone.
  * @param {Page} _file File to check the wait time for
  * @returns {number} indicating the number of days since the file was last modified, rounded down.
  */
  getWaitingTime(_file) {
    return _file.waitTime
  }
  
  /**
  *
  * @param {Page} _file File to check
  * @returns `true` if the file isn't done and has been flagged as waiting, or `false` otherwise.
  */
  isWaiting(_file) {
  // don't apply waiting status to completely finished items
    return this.getStatus(_file) !== 'done' && this.getWaitingTime(_file) >= 4 ? 'waiting' : ''
  }
  
  getStatus(_file) {
    let status = 'needs attention'
    if (_file.file.path.contains('WIP')) {
      status = this.getIncompleteStatus(_file)
    } else {
      status = this.getReadyStatus(_file)
    }
    return status
  }
  
  getIncompleteStatus(_file) {
    let status = 'incomplete'
    if (this.hasConnections(_file)) {
      status = 'editing'
    } else {
      status = 'writing'
    }
    return status
  }
  
  getReadyStatus(_file) {
    let publish = _file.publish
    let status = 'almost there'
    let connected = this.hasConnections(_file)
    if (!connected) {
      status = 'close'
    } else if (connected && _file.connections[this._m.subtypes[1]].size === 0) {
      status = 'ready'
    } if (connected && (publish === true || publish === 'yes' || publish === 'published')) {
      status = 'done'
    } else if (connected && publish === 'submitted') {
      status = publish
    }
    return status
  }
}
  
let pattern = new Pattern(input.filter, input.typekey, input.type, input.subtypekey, input.subtypes)

pattern.prep()

dv.paragraph(`**Color Key:** <span class="writing">Writing</span>; <span class="editing">Editing</span>; <span class="close">Close</span>; <span class="ready">Ready</span>; <span class="submitted">Submitted</span>; <span class="done">Done</span>; <span class="waiting">Waiting</span>`)
dv.paragraph(`**Symbol Key:** γ—Type; λ-Days since modified; Δ—Status; Ψ—Branches; ῼ—Thoughts`)

dv.header(2, "All Stories")
dv.table(
  [
    "Title",
    "γ",
    "λ",
    "Δ",
    "Ψ",
    "ῼ"
  ],
  pattern.getFilesOfType('primary')
    .sort(s => s.file.name)
    .map(s => [
      s.file.link,
      s.Subtype ? s.Subtype : s.Type,
      pattern.getWaitingTime(s),
      `<span class="${pattern.getStatus(s)} ${pattern.isWaiting(s)}">\u2766</span>`,
      s.connections[pattern._m.subtypes[0]].size,
      s.connections[pattern._m.subtypes[1]].size
    ])
)
