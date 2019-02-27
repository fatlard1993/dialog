// includes js-util dom log
// babel
/* global util dom log ColorPicker */

var prompt = function(className, heading, content, buttons, onAdd){
	if(className instanceof Object){
		onAdd = className.onAdd;
		buttons = className.buttons;
		content = className.content;
		heading = className.heading;
		className = className.className;
	}

	buttons = buttons || 'OK';

	if(prompt.isOpen) return prompt.que.push([className, heading, content, buttons, onAdd]);

	prompt.isOpen = true;

	prompt.wrapper = prompt.wrapper || document.getElementById('promptWrapper') || dom.createElem('div', { id: 'promptWrapper', prependTo: document.body});

	dom.animation.add('write', function prompt_anim(){
		if(!prompt.active){
			prompt.active = dom.createElem('div', { id: 'prompt' });
			prompt.active.promptHeading = dom.createElem('div', { className: 'heading' });
			prompt.active.promptContent = dom.createElem('div', { className: 'content' });
			prompt.active.btnContainer = dom.createElem('div');

			prompt.active.appendChild(prompt.active.promptHeading);
			prompt.active.appendChild(prompt.active.promptContent);
			prompt.active.appendChild(prompt.active.btnContainer);

			prompt.wrapper.appendChild(prompt.active);
		}

		else{
			dom.empty(prompt.active.promptContent);
			dom.empty(prompt.active.btnContainer);
		}

		prompt.active.promptHeading.textContent = heading;

		if(content && content.nodeType) prompt.active.promptContent.appendChild(content);

		else if(content) prompt.active.promptContent.textContent = content;

		buttons = buttons.split('|');

		for(var x = 0, buttonCount = buttons.length, button; x < buttonCount; ++x){
			button = dom.createElem('button', { className: 'promptBtn b'+ buttonCount + ((x + 1) === buttonCount ? ' defaultOption' : ''), textContent: buttons[x] });

			prompt.active.btnContainer.appendChild(button);
		}

		dom.show(prompt.active, className, function(){
			prompt.wrapper.className = '';

			prompt.fix();

			if(onAdd) onAdd();

			setTimeout(function(){
				var firstInput = prompt.active.getElementsByTagName('input')[0];

				if(firstInput) firstInput.focus();
			}, 250);
		});
	});
};

prompt.fix = function(){
	if(prompt.isOpen){
		dom.animation.add('write', function(){
			var availableHeight = (dom.availableHeight + 5) - (dom.storage.get('largeUI') ? 107 : 91);
			var maxHeight;

			if(dom.availableHeight <= 194) maxHeight = availableHeight;

			else maxHeight = Math.floor(availableHeight * 0.8) - 32;

			prompt.active.promptContent.style.maxHeight = maxHeight +'px';
		});
	}
};

prompt.que = [];
prompt.resolve = {};
prompt.validation = {};

prompt.dismiss = function(choice, evt){
	if(prompt.isOpen){
		choice = choice || prompt.active.getElementsByClassName('defaultOption')[0].textContent;

		var promptName = prompt.active.className.replace(/error|warning|success|info|\s/g, '');

		if({ OK: 1 }[choice]) prompt.validate();

		if(prompt.resolve[promptName]) prompt.resolve[promptName](choice, evt);

		dom.discard(prompt.active, null, function(){
			prompt.isOpen = false;

			if(prompt.que.length){
				prompt.apply(null, prompt.que.shift());
			}

			else{
				dom.hide(prompt.wrapper);
			}

			document.activeElement.blur();
		}, 200);
	}
};

prompt.validate = function(){
	var promptName = prompt.active.className.replace(/error|warning|success|info|\s/g, '');
	var invalidElements = prompt.active.promptContent.getElementsByClassName('invalid');

	if(invalidElements.length){
		if(prompt.active.validationWarning) dom.remove(prompt.active.getElementsByClassName('validationWarning'));

		prompt.active.getElementsByClassName('defaultOption')[0].className = prompt.active.getElementsByClassName('defaultOption')[0].className.replace(/\s?active/, '');

		for(var x = 0; x < invalidElements.length; ++x){
			var validationWarning = dom.validate(invalidElements[x]);

			if(validationWarning){
				prompt.active.validationWarning = 1;

				invalidElements[x].parentElement.insertBefore(dom.createElem('p', { className: 'validationWarning', textContent: validationWarning }), invalidElements[x]);
			}
		}

		if(!prompt.active.validationWarning){
			prompt.active.validationWarning = dom.createElem('p', { className: 'validationWarning', textContent: 'There are fields which require your attention!' });

			dom.prependChild(prompt.active.promptContent, prompt.active.validationWarning);
		}

		if(prompt.validation[promptName]) prompt.validation[promptName](invalidElements);

		return;
	}
};

prompt.err = function(message, onAdd){
	prompt('error', 'Error', message, 'OK', onAdd);
};

prompt.wrn = function(message, onAdd){
	prompt('warning', 'Warning', message, 'OK', onAdd);
};

prompt.info = function(message, onAdd){
	prompt('info', 'Info', message, 'OK', onAdd);
};

prompt.success = function(message, onAdd){
	prompt('success', 'Success', message, 'OK', onAdd);
};

prompt.tip = function(tipName){
	prompt.tip.list = prompt.tip.list  || {};

	var tip;

	if(tipName instanceof Object){
		tip = tipName;
		tipName = tip.heading;
	}

	else tip = prompt.tip.list[tipName];

	if(!tip) tip = { 	content: 'prompt.tip.list['+ tipName +'] does not exist!' };

	if(tip.id && dom.storage.get('blacklist_tip:'+ tip.id) === 'true') return;

	var content = dom.createElem('div', { textContent: tip.content });

	if(tip.id){
		var blacklistCheckbox = dom.createElem('input', { type: 'checkbox', checked: true });

		var blacklistLabel = dom.createElem('label', { textContent: 'Don\'t show again: ' });

		blacklistLabel.appendChild(blacklistCheckbox);
		content.appendChild(blacklistLabel);

		prompt.resolve.tip = function(){
			if(blacklistCheckbox.checked) dom.storage.set('blacklist_tip:'+ tip.id, true);
		};
	}

	prompt('tip', tipName, content, 'OK');
};

prompt.form = function(heading, inputs, buttons, onResolve, text){
	var promptID = heading.replace(/\s/g, '_');
	var inputNames = Object.keys(inputs), inputCount = inputNames.length;
	var formObj = {};

	prompt(promptID, heading, text, buttons, function(){
		for(var x = 0; x < inputCount; ++x){
			var inputType = (typeof inputs[inputNames[x]]).replace('string', 'text').replace('boolean', 'checkbox');
			if(typeof ColorPicker !== 'undefined' && inputType === 'text' && inputs[inputNames[x]].startsWith('rgb')) inputType = 'colorPicker';

			var input = inputType === 'colorPicker' ? ColorPicker.create(inputs[inputNames[x]]) : document.createElement('input');
			input.name = inputNames[x];
			input.type = inputType;

			if(inputType === 'checkbox') input.checked = inputs[inputNames[x]];

			else input.value = inputs[inputNames[x]];

			formObj[inputNames[x]] = input;

			var label = document.createElement('label');
			label.textContent = util.capitalize(util.fromCamelCase(inputNames[x])) +': ';
			label.appendChild(input);

			prompt.active.promptContent.appendChild(label);

			if(x === 0) input.select();
		}

		prompt.resolve[promptID] = function(choice){
			var changesObj = {};

			for(var x = 0; x < inputCount; ++x){
				var value = formObj[inputNames[x]].value;

				if(formObj[inputNames[x]].type === 'checkbox') value = formObj[inputNames[x]].checked;

				else if(formObj[inputNames[x]].type === 'number') value = Number(value);

				if(value !== inputs[inputNames[x]]) changesObj[inputNames[x]] = value;
			}

			log()(formObj);
			onResolve(choice, changesObj);
		};
	});
};

prompt.clearAll = function(){
	prompt.que = [];
	prompt.dismiss('cancel');
};

prompt.onPointerUp = function(evt){
	if(evt.target.className.includes('promptBtn')){
		evt.preventDefault();
		dom.interact.pointerTarget = null;

		prompt.dismiss(evt.target.textContent, evt);
	}
};

prompt.onKeyDown = function(evt, keyPressed){
	if(keyPressed === 'ENTER'){
		if(prompt.isOpen){
			evt.preventDefault();

			prompt.active.getElementsByClassName('defaultOption')[0].className += ' active';
		}
	}
};

prompt.onKeyUp = function(evt, keyPressed){
	if(keyPressed === 'ENTER'){
		if(prompt.isOpen){
			evt.preventDefault();

			document.activeElement.blur();

			prompt.dismiss(prompt.active.getElementsByClassName('defaultOption')[0].textContent, evt);
		}
	}

	else if(keyPressed === 'ESCAPE'){
		if(prompt.isOpen){
			evt.preventDefault();

			prompt.dismiss('cancel');
		}
	}

	if(prompt.active && prompt.active.validationWarning){
		dom.remove(prompt.active.getElementsByClassName('validationWarning'));

		delete prompt.active.validationWarning;

		prompt.validate();
	}
};

prompt.init = function(){
	dom.interact.on('pointerUp', prompt.onPointerUp);
	dom.interact.on('keyDown', prompt.onKeyDown);
	dom.interact.on('keyUp', prompt.onKeyUp);
};