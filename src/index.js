/* global colorPicker */

import Log from 'log';
import util from 'js-util';
import dom from 'dom';

var dialog = function(className, heading, content, buttons, onAdd){
	if(className instanceof Object){
		onAdd = className.onAdd;
		buttons = className.buttons;
		content = className.content;
		heading = className.heading;
		className = className.className;
	}

	if(typeof buttons === 'undefined') buttons = 1;
	if(typeof buttons === 'string') buttons = buttons.split('|');
	if(typeof buttons === 'number') buttons = [['x'], ['OK'], ['OK', 'Cancel']][buttons || 0];

	var dialogSettings = [className, heading, content, buttons, onAdd];

	if(dialog.isOpen) return dialog.que.push(dialogSettings);

	dialog.named = dialog.named || {};
	dialog.isOpen = className || true;

	dialog.wrapper = dialog.wrapper || document.getElementById('dialogWrapper') || dom.createElem('div', { id: 'dialogWrapper', className: 'discard disappear', prependTo: document.body });

	dom.animation.add('write', function dialog_anim(){
		if(!dialog.active){
			dialog.active = dom.createElem('div', { id: 'dialog' });
			dialog.active.heading = dom.createElem('div', { className: 'heading' });
			dialog.active.content = dom.createElem('div', { className: 'content' });
			dialog.active.btnContainer = dom.createElem('div');

			dialog.active.appendChild(dialog.active.heading);
			dialog.active.appendChild(dialog.active.content);
			dialog.active.appendChild(dialog.active.btnContainer);

			dialog.wrapper.appendChild(dialog.active);
		}

		else{
			dom.empty(dialog.active.content);
			dom.empty(dialog.active.btnContainer);
		}

		if(className === '__init__'){
			dialog.isOpen = false;

			if(typeof heading === 'function') heading();

			return;
		}

		dialog.active.className = className;
		dialog.active.heading.textContent = heading;
		dialog.active.name = className.replace(/error|warning|success|info|\s/g, '');

		if(dialog.active.name) dialog.named[dialog.active.name] = dialog.bind(null, ...dialogSettings);

		if(content && content.nodeType) dialog.active.content.appendChild(content);

		else if(typeof content === 'object') dom.appendChildren.apply(null, content.unshift(dialog.active.content) && content);

		else if(content) dialog.active.content.textContent = content;

		for(var x = 0, buttonCount = buttons.length, button; x < buttonCount; ++x){
			button = dom.createElem('button', { className: 'dialogBtn b'+ buttonCount, textContent: buttons[x], appendTo: dialog.active.btnContainer });

			if(buttonCount === 1 && buttons[x] === 'x'){
				button.textContent = '';
				button.classList.add('x');
			}

			if(!x) button.classList.add('default');
		}

		dom.show(dialog.active, '', function(){
			dialog.wrapper.className = '';

			dialog.fix();

			document.activeElement.blur();

			setTimeout(function(){
				var firstInput = dialog.active.getElementsByTagName('input')[0];

				if(firstInput) firstInput.focus();

				if(onAdd) onAdd();
			}, 250);
		});
	});
};

dialog.log = new Log({ tag: 'dialog' });

dialog.fix = function(){
	if(dialog.isOpen){
		dom.animation.add('write', function(){
			var availableHeight = (dom.availableHeight + 5) - (dom.storage.get('largeUI') ? 107 : 91);
			var maxHeight;

			if(dom.availableHeight <= 194) maxHeight = availableHeight;

			else maxHeight = Math.floor(availableHeight * 0.8) - 32;

			dialog.active.content.style.maxHeight = maxHeight +'px';
		});
	}
};

dialog.que = [];
dialog.resolve = {};
dialog.validation = {};

dialog.dismiss = function(choice, evt){
	if(!dialog.isOpen || dialog.closing) return;

	choice = choice || dialog.active.getElementsByClassName('default')[0].textContent;

	var dialogName = dialog.active.className.replace(/error|warning|success|info|\s/g, '');

	if({ OK: 1, save: 1, Save: 1 }[choice]){
		var warnings = dom.showValidationWarnings(dialog.active.content);

		if(dialog.active.getElementsByClassName('active')[0]) dialog.active.getElementsByClassName('active')[0].classList.remove('active');

		if(warnings) return dialog.resolve[dialogName]('validationWarning', evt);
	}

	dialog.closing = true;

	if(dialog.resolve[dialogName]) dialog.resolve[dialogName](choice, evt);

	dom.discard(dialog.active, null, function(){
		if(dialog.que.length){
			dialog.isOpen = false;
			dialog.closing = false;

			dialog.apply(null, dialog.que.shift());
		}

		else setTimeout(function(){
			dom.discard(dialog.wrapper, '' , function(){
				setTimeout(function(){
					dialog.isOpen = false;
					dialog.closing = false;

					if(dialog.que.length) dialog.apply(null, dialog.que.shift());
				}, 300);
			});
		}, 200);

		document.activeElement.blur();
	}, 200);
};

dialog.err = function(message, onAdd){
	dialog('error', 'Error', message, 0, onAdd);
};

dialog.warn = function(message, onAdd){
	dialog('warning', 'Warning', message, 'OK', onAdd);
};

dialog.info = function(message, onAdd){
	dialog('info', 'Info', message, 'OK', onAdd);
};

dialog.success = function(message, onAdd){
	dialog('success', 'Success', message, 'OK', onAdd);
};

dialog.tip = function(tipName){
	dialog.tip.list = dialog.tip.list || {};

	var tip;

	if(tipName instanceof Object){
		tip = tipName;
		tipName = tip.heading;
	}

	else tip = dialog.tip.list[tipName];

	if(!tip) tip = { 	content: `dialog.tip.list[${tipName}] does not exist!` };

	if(tip.id && dom.storage.get('blacklist_tip:'+ tip.id) === 'true') return;

	var content = dom.createElem('div', { textContent: tip.content });

	if(tip.id){
		var blacklistCheckbox = dom.createElem('input', { type: 'checkbox', checked: true });

		var blacklistLabel = dom.createElem('label', { textContent: 'Don\'t show again: ' });

		blacklistLabel.appendChild(blacklistCheckbox);
		content.appendChild(blacklistLabel);

		dialog.resolve.tip = function(){
			if(blacklistCheckbox.checked) dom.storage.set('blacklist_tip:'+ tip.id, true);
		};
	}

	dialog('tip', tipName, content, 'OK');
};

dialog.form = function(heading, inputs, buttons, onResolve, text){
	var dialogID = heading.replace(/\s/g, '_');
	var inputNames = Object.keys(inputs), inputCount = inputNames.length;
	var formObj = {};

	dialog(dialogID, heading, text, buttons, function(){
		for(var x = 0; x < inputCount; ++x){
			var inputType = (typeof inputs[inputNames[x]]).replace('string', 'text').replace('boolean', 'checkbox');

			if(typeof colorPicker !== 'undefined' && inputType === 'text' && (inputs[inputNames[x]].startsWith('rgb(') || inputs[inputNames[x]].startsWith('hsl('))) inputType = 'colorPicker';

			var input = inputType === 'colorPicker' ? colorPicker.create(inputs[inputNames[x]]) : document.createElement('input');
			input.name = inputNames[x];
			input.type = inputType;
			input.labelText = util.capitalize(util.fromCamelCase(inputNames[x]));
			input.initialValue = inputs[inputNames[x]];

			if(inputType === 'text' && input.initialValue.includes('$required$')){
				input.validation = [/.{1,}/];
				input.validationWarning = [`${input.labelText} is required`];
				input.validate = 0;

				delete input.initialValue;
			}

			else if(inputType === 'colorPicker') delete input.initialValue;

			else if(inputType === 'checkbox') input.checked = input.initialValue;

			else input.value = input.initialValue;

			formObj[inputNames[x]] = input;

			dom.createElem('label', { textContent: input.labelText, appendChild: input, appendTo: dialog.active.content });

			if(x === 0) input.select();
		}

		dialog.resolve[dialogID] = function(choice){
			var changesObj = {};

			inputNames.forEach((name) => {
				var value = formObj[name].value, initialValue = formObj[name].initialValue, type = formObj[name].type;

				if(type === 'checkbox') value = formObj[name].checked;

				else if(type === 'number') value = Number(value);

				if(value !== initialValue) changesObj[name] = value;
			});

			dialog.log()('Resolve form', formObj, changesObj);

			onResolve(choice, changesObj);
		};
	});
};

dialog.clearAll = function(){
	dialog.que = [];
	dialog.dismiss('Cancel');
};

dom.interact.on('pointerUp', function(evt){
	if(evt.target.className.includes('dialogBtn')){
		evt.preventDefault();

		dialog.dismiss(evt.target.textContent, evt);
	}
});

dom.interact.on('keyDown', function(evt){
	if(!dialog.isOpen) return;

	if(evt.keyPressed === 'ENTER' && (evt.ctrlKey || evt.target.nodeName !== 'TEXTAREA')){
		evt.preventDefault();

		dialog.active.getElementsByClassName('default')[0].className += ' active';
	}

	else if(evt.keyPressed === 'ESCAPE'){
		evt.preventDefault();

		var xButton = dialog.active.getElementsByClassName('x')[0];

		if(xButton) xButton.className += ' active';
	}
});

dom.interact.on('keyUp', function(evt){
	if(!dialog.isOpen) return;

	if(evt.keyPressed === 'ENTER' && (evt.ctrlKey || (evt.target.nodeName !== 'TEXTAREA' && !dialog.isOpen.includes('ignoreReturn')))){
		evt.preventDefault();

		document.activeElement.blur();

		dialog.dismiss(dialog.active.getElementsByClassName('default')[0].textContent, evt);
	}

	else if(evt.keyPressed === 'ESCAPE'){
		evt.preventDefault();

		dialog.dismiss('Cancel');
	}

	if(dialog.active && dialog.active.validationWarning){
		dom.remove(dialog.active.getElementsByClassName('validationWarning'));

		delete dialog.active.validationWarning;

		dialog.validate();
	}
});