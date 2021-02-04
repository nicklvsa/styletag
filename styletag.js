const TAGGED_ATTR = 'tagged';

const useStyleTag = (store) => {
    const TAGGED = {};

    const genID = (prefix) => {
        if (!prefix || prefix === '') {
            prefix = 'elem';
        }
        return `${prefix}_${Math.random().toString(36).substr(2, 9)}`;
    };

    const getCSSRules = (raw) => {
        const rules = [];
        raw = raw.replace('\n', '').trim();
        const matcher = /[\#\.\w\-\,\s\n\r\t:]+(?=\s*\{)/g;
        raw.match(matcher).forEach(found => {;
            rules.push(found.trim());
        });
        return rules;
    };

    const cssRulesToJSRule = (rule) => {
        const arr = rule.split('');
        arr.forEach((ch, i) => {
            if (ch === '-') {
                arr[i+1] = arr[i+1].toUpperCase();
                arr[i] = null;
            }
        });
        return arr.join('');
    };

    const styles = document.querySelectorAll('style');
    for (let i = 0; i < styles.length; i++) {
        const style = styles[i];
        if (style.hasAttribute(TAGGED_ATTR)) {
            styles[i].setAttribute(TAGGED_ATTR, genID(TAGGED_ATTR));
            TAGGED[style.getAttribute(TAGGED_ATTR)] = getCSSRules(style.textContent);
        }
    }

    const links = document.querySelectorAll('link');
    for (let i = 0; i < links.length; i++) {
        const link = links[i];
        if (link.hasAttribute('href') && link.hasAttribute('tagged') && link.getAttribute('rel').toLowerCase().trim() === 'stylesheet') {
            links[i].setAttribute(TAGGED_ATTR, genID(TAGGED_ATTR));
            fetch(link.getAttribute('href')).then(response => response.text()).then(data => {
                TAGGED[link.getAttribute(TAGGED_ATTR)] = getCSSRules(data);
            });
        }
    }

    const fireChanges = (inputStore) => {
        for (const [key, val] of Object.entries(TAGGED)) {
            for (let i = 0; i < document.styleSheets.length; i++) {
                const sheet = document.styleSheets[i];
                if (sheet.ownerNode.getAttribute(TAGGED_ATTR) === key) {
                    for (let j = 0; j < sheet.cssRules.length; j++) {
                        const rule = sheet.cssRules[j];
                        val.forEach(prop => {
                            if (prop === rule.selectorText) {
                                for (const [ruleKey, ruleValue] of Object.entries(rule.style)) {
                                    if (ruleValue.trim().startsWith('--')) {
                                        for (const [storeKey, storeVal] of Object.entries(inputStore)) {
                                            if (storeKey && storeVal) {
                                                const def = rule.style.getPropertyValue(ruleValue);
                                                if (`%${storeKey.trim()}` === def.trim()) {
                                                    const jsRule = cssRulesToJSRule(ruleValue.split('--')[1].trim());
                                                    sheet.cssRules[j].style[jsRule.trim()] = storeVal.trim();
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        });
                    }
                }
            }
        }
    };

    fireChanges(store.store);

    Object.keys(store.store).forEach(obj => {
        Object.defineProperty(store.store, obj, {
            set: (val) => {
                newStore = {
                    ...store.store,   
                };
                newStore[obj] = val;
                fireChanges(newStore);
            },
        });
    });
}