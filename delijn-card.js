class DeLijnCard extends HTMLElement {

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    setConfig(config) {
      if (!config.entity) {
        throw new Error('Please define an entity');
      }

      const root = this.shadowRoot;
      if (root.lastChild) root.removeChild(root.lastChild);

      const cardConfig = Object.assign({}, config);
      const columns = cardConfig.columns;
      const card = document.createElement('ha-card');
      const content = document.createElement('div');
      const style = document.createElement('style');
      style.textContent = `
            ha-card {
              /* sample css */
            }
            table {
              width: 100%;
              padding: 0 32px 0 32px;
              text-align: left;
            }
            thead th {
              text-align: left;
            }
            tbody tr {
              background-color: var(--paper-card-background-color);
            }
            td a {
              color: var(--primary-text-color);
              text-decoration-line: none;
              font-weight: normal;
            }
            .line-number{
              display:block;
              float:left;
              min-width:2.75em;
              text-align:center;
              font-weight:bold;
              color:#fff;
              border-radius:4px;
              border:3px solid #000;
              margin-left:0px;
              margin-right:12px;
              margin-left:0rem;
              margin-right:0.75rem;
              font-size:12px;
              font-size:0.75rem;
              line-height:1.6em
            }
          `;

      content.id = "container";
      cardConfig.title ? card.header = cardConfig.title : null;
      card.appendChild(content);
      card.appendChild(style);
      root.appendChild(card);
      this._config = cardConfig;
    }

    set hass(hass) {
      const config = this._config;
      const root = this.shadowRoot;
      const card = root.lastChild;

      if (hass.states[config.entity]) {
        const feed = hass.states[config.entity].attributes['next_passages'];
        const config_type = config.config_type;
        var columns = config.columns;
        this.style.display = 'block';
        const rowLimit = config.row_limit ? config.row_limit : Object.keys(feed).length;
        let rows = 0;

        if (config_type == "default" || !config_type) {
          // set a default configuration
          columns = [{'field': 'line_number_public', 'title': 'Line'},
                     {'field': 'line_transport_type', 'title': 'Type'},
                     {'field': 'final_destination', 'title': 'Towards'},
                     {'field': 'due_in_min', 'title': 'Due in (min)'}];
        } else if (config_type == "columns" && !columns) {
          columns = config.columns;
        } else if (config_type == "raw" || !columns) {
          columns = null;
        }

        // First: define the header (1st row OR taken from config)
        if (feed !== undefined && Object.keys(feed).length > 0) {
          let card_content = '<table><thread><tr>';

          if (!columns) {
            card_content += `<tr>`;
            // in case no columns are selected in the config then we
            // print all the technical names of the columns as header line
            for(var key in feed[0]) {
              if(feed[0].hasOwnProperty(key)) { //to be safe
                card_content += `<th>${key}</th>`;
              }
            }
          } else {
            for (let column in columns) {
              if (columns.hasOwnProperty(column)) {
                card_content += `<th>${columns[column].title}</th>`;
              }
            }
          }

          card_content += `</tr></thead><tbody>`;

          // Next: define the body/contents (all rows or only those in config)
          for (let entry in feed) {
            if (rows >= rowLimit) break;

            var bordercol = '#'+feed[entry]['line_number_colourBackBorderHex']
            var backcol = '#'+feed[entry]['line_number_colourBackHex']
            var color = '#'+feed[entry]['line_number_colourFrontHex']

            if (feed.hasOwnProperty(entry)) {
              // if there's no columns in config defined then print all
              if (!columns) {
                for (let field in feed[entry]) {
                  if (feed[entry].hasOwnProperty(field)) {
                    // show proper line number format of De Lijn for the line_number_public
                    if (field == 'line_number_public') {
                      card_content += `<td class= "line-number" style = "border-color: ${bordercol}; background-color: ${backcol}; color: ${color};">${feed[entry][field]}</td>`;;
                    } else {
                      card_content += `<td>${feed[entry][field]}</td>`;
                    }
                  }
                }
              // else we print only the selected columns
              } else {
                let has_field = true;

                for (let column in columns) {
                  if (!feed[entry].hasOwnProperty(columns[column].field)) {
                    has_field = false;
                    break;
                  }
                }

                if (!has_field) continue;
                card_content += `<tr>`;

                for (let column in columns) {
                  if (columns.hasOwnProperty(column)) {
                    // show proper line number format of De Lijn for the line_number_public
                    if(columns[column].field == 'line_number_public') {
                      card_content += `<td class= "line-number" style = "border-color: ${bordercol}; background-color: ${backcol}; color: ${color};">`;
                      let newText = feed[entry][columns[column].field];
                      card_content += `${newText}`;
                    } else if(columns[column].field == 'line_transport_type') {
                      // ideally we show icons here for the different types (not yet implemented)
                      card_content += `<td class=${columns[column].field}>`;
                      let newText = feed[entry][columns[column].field];
                      card_content += `${newText}`;
                    } else if (columns[column].field == 'due_at_schedule' || columns[column].field == 'due_at_realtime') {
                      card_content += `<td class=${columns[column].field}>`;
                      let newText = feed[entry][columns[column].field];
                      if (newText !== null) {
                        // change string to correct datetime with timezone offset
                        var dt = new Date(newText);
                        // only retrieve the hh:mm and not the seconds (which are almost always 00)
                        newText = dt.toLocaleTimeString().replace(/([\d]+:[\d]{2})(:[\d]{2})/, "$1");
                        card_content += `${newText}`;
                      } else {
                        newText = ""
                        card_content += `${newText}`;
                      }
                    } else {
                      card_content += `<td class=${columns[column].field}>`;
                      let newText = feed[entry][columns[column].field];
                      card_content += `${newText}`;
                    }
                    card_content += `</td>`;
                  }
                }
              }

              card_content += `</tr>`;
              ++rows;
            }
          }

          root.lastChild.hass = hass;
          card_content += `</tbody></table>`;
          root.getElementById('container').innerHTML = card_content;
        } else {
          this.style.display = 'none';
        }
      } else {
        this.style.display = 'none';
      }
    }

    getCardSize() {
      return 1;
    }
  }

customElements.define('delijn-card', DeLijnCard)
