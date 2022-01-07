/**
 * Pattern Tracking v0.3.0
 * Automated tracking for story progress based on location and link data.
 */

/* Using directly inside a `dataviewjs` block?
 *  Uncomment this section and replace the data with what you need!
 */
// const input = {
//   title: 'All Stories',
//   filter: '-"~META"',
//   typeKeys: {
//     t: 'Type',
//     st: 'Subtype'
//   },
//   types: {
//     primary: 'story',
//     subtypes: ['side-story', 'thought']
//   },
//   stageNames: {
//     stage1: 'writing',
//     stage2: 'editing',
//     stage3: 'close',
//     stage4: 'ready',
//     stage5: 'submitted',
//     stage6: 'done',
//     stagewaiting: 'waiting',
//   },
//   patternLocations: {
//     notReady: 'WIP',
//     ready: null
//   }
// }
  
class Pattern {
  constructor(_patternTitle, _filterString, _typeKeys, _types, _stages, _locations) {
    this._m = {
      title: _patternTitle,
      filter: _filterString,
      typeKeys: _typeKeys,
      types: _types,
      stages: _stages,
      locations: _locations // unused for now
    }
    
    this.ALL = dv.pages(this._m.filter).where(s => s[this._m.typeKeys.t] === this._m.types.primary)
    if (this._m.typeKeys.st) {
      this.primary = this.ALL.where(s => s[this._m.typeKeys.st] == null)
      for (let subtype of this._m.types.subtypes) {
        this[subtype] = this.ALL.where(s => s[this._m.typeKeys.st] === subtype)
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

    let subtypes = _subtypes ? _subtypes : this._m.types.subtypes
    
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
    for (let st of this._m.types.subtypes) {
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
      for (let st of this._m.types.subtypes) {
        _file.connections[st] = new Set()
      }
    }
  
    for (let f of _file.file.outlinks) {
      let p = dv.page(f)
      
      // check each linked page for page.Subtype to be `side-story` or `thought`
      for (let st of this._m.types.subtypes) {
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
    return this.getStatus(_file) !== 'done' && this.getWaitingTime(_file) >= 4 ? 'stagewaiting' : ''
  }
  
  getStatus(_file) {
    let status = 'needs attention'
    let fPath = _file.file.path
    if (this._m.locations.notReady) {
      if (fPath.contains(this._m.locations.notReady)) {
        status = this.getNotReadyStatus(_file)
      } else {
        status = this.getReadyStatus(_file)
      }
    } else if (this._m.locations.ready) {
      if (fPath.contains(this._m.locations.ready)) {
        status = this.getReadyStatus(_file)
      } else {
        status = this.getNotReadyStatus(_file)
      }
    } 
    return status
  }
  
  getNotReadyStatus(_file) {
    let status = 'incomplete'
    if (this.hasConnections(_file)) {
      status = this.stageLookup('stage2')
    } else {
      status = this.stageLookup('stage1')
    }
    return status
  }
  
  getReadyStatus(_file) {
    let publish = _file.publish
    let status = 'almost there'
    let connected = this.hasConnections(_file)
    if (!connected) {
      status = this.stageLookup('stage3')
    } else if (connected && _file.connections[this._m.types.subtypes[1]].size === 0) {
      status = this.stageLookup('stage4')
    } if (connected && (publish === true || publish === 'yes' || publish === 'published')) {
      status = this.stageLookup('stage6')
    } else if (connected && publish === 'submitted') {
      status = this.stageLookup('stage5')
    }
    return status
  }

  stageLookup(_stage, _reverseLookup) {
    let s
    if (!_reverseLookup) {
      s = this._m.stages[_stage]
    } else {
      for (let [stage, name] of Object.entries(this._m.stages)) {
        if (name === _stage) {
          s = stage
          break
        }
      }
    }
    return s
  }

  getStageFromStatus(_file) {
    let status = this.getStatus(_file)
    let stage = this.stageLookup(status, true)
    return stage
  }

  getTitle() {
    return this._m.title
  }
}
  
let pattern = new Pattern(input.filter, input.typeKeys, input.types, input.stageNames, input.patternLocations)

pattern.prep()

dv.paragraph(`**Color Key:** <span class="stage1">${pattern.stageLookup('stage1')}</span>; <span class="stage2">${pattern.stageLookup('stage2')}</span>; <span class="stage3">${pattern.stageLookup('stage3')}</span>; <span class="stage4">${pattern.stageLookup('stage4')}</span>; <span class="stage5">${pattern.stageLookup('stage5')}</span>; <span class="stage6">${pattern.stageLookup('stage6')}</span>; <span class="stagewaiting">${pattern.stageLookup('stagewaiting')}</span>`)
dv.paragraph(`**Symbol Key:** γ—Type; λ-Days since modified; Δ—Status; Ψ—Branches; ῼ—Thoughts`)

dv.header(2, pattern.getTitle())
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
      `<span class="${pattern.getStageFromStatus(s)} ${pattern.isWaiting(s)}">\u2766</span>`,
      s.connections[pattern._m.types.subtypes[0]].size,
      s.connections[pattern._m.types.subtypes[1]].size
    ])
)
