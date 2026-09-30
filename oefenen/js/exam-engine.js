(function (root, factory) {
  'use strict';
  var engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root) root.CafaExamEngine = engine;
}(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }

  function isText(value) {
    return typeof value === 'string' && value.trim().length > 0;
  }

  function isId(value) {
    return isText(value) && /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(value) &&
      ['__proto__', 'constructor', 'prototype'].indexOf(value) === -1;
  }

  function isDate(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    var parsed = new Date(value + 'T00:00:00.000Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }

  function isSchedule(value) {
    // Require an explicit offset, so the release window does not depend on the reader's timezone.
    return typeof value === 'string' &&
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
      isDate(value.slice(0, 10)) && Number.isFinite(Date.parse(value));
  }

  function validateExam(exam) {
    var errors = [];
    if (!isRecord(exam)) return { valid: false, errors: ['Het tentamen moet een object zijn.'] };
    if (!isId(exam.id)) errors.push('Gebruik een unieke tentamen-ID met letters, cijfers, punten, streepjes of underscores.');
    if (!isText(exam.title)) errors.push('De tentamentitel ontbreekt.');
    if (!isDate(exam.date)) errors.push('De tentamendatum moet een geldige datum zijn in YYYY-MM-DD.');
    if (!Number.isSafeInteger(exam.durationMinutes) || exam.durationMinutes < 1) {
      errors.push('De tentamenduur moet een positief geheel aantal minuten zijn.');
    }
    if (exam.introduction !== undefined && typeof exam.introduction !== 'string') {
      errors.push('De welkomsttekst moet gewone tekst zijn.');
    }
    if (exam.introductionHtml !== undefined && typeof exam.introductionHtml !== 'string') {
      errors.push('De opgemaakte welkomsttekst moet een HTML-tekst zijn.');
    }
    if (exam.maxScore !== undefined && (!Number.isFinite(exam.maxScore) || exam.maxScore <= 0)) {
      errors.push('De maximumscore moet een getal groter dan nul zijn.');
    }
    if (exam.passPoints !== undefined && (!Number.isFinite(exam.passPoints) || exam.passPoints < 0)) {
      errors.push('De cesuur moet een getal van nul of hoger zijn.');
    }
    if (Number.isFinite(exam.maxScore) && Number.isFinite(exam.passPoints) && exam.passPoints > exam.maxScore) {
      errors.push('De cesuur mag niet hoger zijn dan de maximumscore.');
    }
    if (exam.instructions !== undefined && (!Array.isArray(exam.instructions) ||
      exam.instructions.some(function (instruction) { return !isText(instruction); }))) {
      errors.push('De instructies moeten een lijst met teksten zijn.');
    }
    ['availableFrom', 'deadline'].forEach(function (field) {
      if (exam[field] !== undefined && !isSchedule(exam[field])) {
        errors.push(field + ' moet een geldige ISO-datum met tijd en tijdzone zijn.');
      }
    });
    if (isSchedule(exam.availableFrom) && isSchedule(exam.deadline) &&
      Date.parse(exam.deadline) <= Date.parse(exam.availableFrom)) {
      errors.push('De deadline moet na de beschikbaarheidsdatum liggen.');
    }
    var sectionIds = new Set();
    if (exam.sections !== undefined) {
      if (!Array.isArray(exam.sections)) {
        errors.push('De tentamenonderdelen moeten een lijst zijn.');
      } else {
        exam.sections.forEach(function (section, index) {
          var prefix = 'Onderdeel ' + (index + 1) + ': ';
          if (!isRecord(section)) { errors.push(prefix + 'ongeldig onderdeel.'); return; }
          if (!isId(section.id) || sectionIds.has(section.id)) errors.push(prefix + 'een geldige, unieke onderdeel-ID is vereist.');
          sectionIds.add(section.id);
          if (!isText(section.title)) errors.push(prefix + 'de titel ontbreekt.');
          if (typeof section.contentHtml !== 'string') errors.push(prefix + 'de casusinformatie moet een HTML-tekst zijn.');
        });
      }
    }
    if (!Array.isArray(exam.questions) || exam.questions.length === 0) {
      errors.push('Een tentamen moet minstens één vraag bevatten.');
    } else {
      var ids = new Set();
      exam.questions.forEach(function (question, index) {
        var prefix = 'Vraag ' + (index + 1) + ': ';
        if (!isRecord(question)) { errors.push(prefix + 'ongeldige vraag.'); return; }
        if (!isId(question.id) || ids.has(question.id)) errors.push(prefix + 'een geldige, unieke vraag-ID is vereist.');
        ids.add(question.id);
        if (!isText(question.prompt)) errors.push(prefix + 'de vraagtekst ontbreekt.');
        if (question.promptHtml !== undefined && typeof question.promptHtml !== 'string') errors.push(prefix + 'de opgemaakte vraag moet een HTML-tekst zijn.');
        if (question.sectionId !== undefined && (!isId(question.sectionId) || !sectionIds.has(question.sectionId))) {
          errors.push(prefix + 'het onderdeel verwijst niet naar een geldige casus.');
        }
        if (question.title !== undefined && !isText(question.title)) errors.push(prefix + 'de titel moet tekst zijn.');
        if (question.type !== 'open' && question.type !== 'mc') errors.push(prefix + 'het type moet open of mc zijn.');
        if (question.solution !== undefined && typeof question.solution !== 'string') errors.push(prefix + 'de oplossing moet tekst zijn.');
        if (question.solutionHtml !== undefined && typeof question.solutionHtml !== 'string') errors.push(prefix + 'de opgemaakte oplossing moet een HTML-tekst zijn.');
        if (question.points !== undefined && (!Number.isFinite(question.points) || question.points < 0)) {
          errors.push(prefix + 'punten moeten een getal van nul of hoger zijn.');
        }
        if (question.type === 'mc') {
          if (!Array.isArray(question.options) || question.options.length < 2) {
            errors.push(prefix + 'een meerkeuzevraag moet minstens twee opties bevatten.');
          } else {
            var optionIds = new Set();
            question.options.forEach(function (option) {
              if (!isRecord(option) || !isId(option.id) || optionIds.has(option.id) || !isText(option.text)) {
                errors.push(prefix + 'antwoordopties moeten unieke IDs en tekst bevatten.');
              }
              if (isRecord(option)) optionIds.add(option.id);
            });
            if (question.correctOptionId !== undefined && !optionIds.has(question.correctOptionId)) {
              errors.push(prefix + 'het juiste antwoord verwijst niet naar een geldige optie.');
            }
          }
        }
      });
    }
    return { valid: errors.length === 0, errors: errors };
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function timestamp(value) {
    var result = value === undefined ? Date.now() : value;
    if (!Number.isSafeInteger(result) || result < 0 || !Number.isFinite(new Date(result).getTime())) {
      throw new TypeError('Een geldige tijdstempel in milliseconden is vereist.');
    }
    return result;
  }

  function createAttempt(exam, options) {
    options = options || {};
    var validation = validateExam(exam);
    if (!validation.valid) throw new TypeError(validation.errors.join(' '));
    var now = timestamp(options.now);
    if (exam.availableFrom !== undefined && now < Date.parse(exam.availableFrom)) {
      throw new RangeError('Dit tentamen is nog niet beschikbaar.');
    }
    if (exam.deadline !== undefined && now >= Date.parse(exam.deadline)) {
      throw new RangeError('De starttermijn van dit tentamen is verstreken.');
    }
    if (options.extraTime !== undefined && typeof options.extraTime !== 'boolean') {
      throw new TypeError('Extra tijd moet aan of uit staan.');
    }
    if (options.id !== undefined && !isId(options.id)) throw new TypeError('Ongeldige poging-ID.');
    var extraMinutes = options.extraTime === true ? 30 : 0;
    var deadlineAt = now + (exam.durationMinutes + extraMinutes) * 60 * 1000;
    timestamp(deadlineAt);
    return {
      id: options.id || exam.id + '-' + now,
      exam: clone(exam),
      startedAt: now,
      deadlineAt: deadlineAt,
      extraMinutes: extraMinutes,
      untimed: options.untimed === true,
      pausedAt: null,
      pausedSeconds: null,
      answers: {},
      currentIndex: 0,
      marked: {},
      status: 'active',
      submittedAt: null,
      finishReason: null
    };
  }

  function remainingSeconds(attempt, now) {
    if (!isRecord(attempt) || !Number.isFinite(attempt.deadlineAt)) throw new TypeError('De eindtijd ontbreekt.');
    if (attempt.untimed) return Infinity;
    if (attempt.pausedAt != null) return Math.max(0, attempt.pausedSeconds || 0);
    return Math.max(0, Math.ceil((attempt.deadlineAt - timestamp(now)) / 1000));
  }

  function pauseAttempt(attempt, now) {
    var time = timestamp(now);
    if (attempt.status !== 'active' || attempt.pausedAt != null || remainingSeconds(attempt, time) === 0) return attempt;
    attempt.pausedSeconds = attempt.untimed ? null : remainingSeconds(attempt, time);
    attempt.pausedAt = time;
    return attempt;
  }
  function resumeAttempt(attempt, now) {
    var time = timestamp(now);
    if (attempt.status !== 'active' || attempt.pausedAt == null) return attempt;
    if (!attempt.untimed) attempt.deadlineAt = time + attempt.pausedSeconds * 1000;
    attempt.pausedAt = null; attempt.pausedSeconds = null;
    return attempt;
  }

  function formatTime(seconds) {
    if (seconds === Infinity) return 'Zonder tijdslimiet';
    if (!Number.isFinite(seconds)) throw new TypeError('Het aantal seconden moet een getal zijn.');
    var value = Math.max(0, Math.ceil(seconds));
    if (value > 600) return Math.ceil(value / 60) + ' min';
    return String(Math.floor(value / 60)).padStart(2, '0') + ':' + String(value % 60).padStart(2, '0');
  }

  function finishAttempt(attempt, options) {
    if (!isRecord(attempt) || ['active', 'completed'].indexOf(attempt.status) === -1) {
      throw new TypeError('Ongeldige poging.');
    }
    var result = clone(attempt);
    if (result.status === 'completed') return result;
    options = options || {};
    var now = timestamp(options.now);
    var expired = remainingSeconds(attempt, now) === 0;
    var reason = options.reason === undefined ? (expired ? 'timeout' : 'submitted') : options.reason;
    if (reason !== 'submitted' && reason !== 'timeout') throw new TypeError('Ongeldige inleverreden.');
    if (reason === 'timeout' && !expired) throw new RangeError('De beschikbare tijd is nog niet verstreken.');
    result.status = 'completed';
    // Reloading after expiry records the deadline itself, not the time of the later visit.
    result.submittedAt = expired ? attempt.deadlineAt : Math.max(attempt.startedAt, now);
    result.finishReason = expired ? 'timeout' : reason;
    return result;
  }

  function hasText(html) {
    if (typeof html !== 'string') return false;
    return html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&(?:nbsp|#160|#x0*a0);/gi, ' ')
      .replace(/[\s\u00a0\u200b-\u200d\ufeff]/g, '').length > 0;
  }

  function answeredCount(attempt) {
    if (!isRecord(attempt) || !isRecord(attempt.exam) || !Array.isArray(attempt.exam.questions)) return 0;
    var answers = isRecord(attempt.answers) ? attempt.answers : {};
    return attempt.exam.questions.filter(function (question) {
      var answer = answers[question.id];
      if (!isRecord(answer)) return false;
      if (question.type === 'open') return (Array.isArray(answer.drawing) && answer.drawing.some(function(stroke){return Array.isArray(stroke) && stroke.length>1 && stroke.every(function(p){return Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);});})) || (Array.isArray(answer.journalRows) && answer.journalRows.some(function(row){return Array.isArray(row) && row.some(function(cell){return typeof cell === 'string' && cell.trim().length > 0;});})) || hasText(answer.html) || (isRecord(answer.stockCells) && Object.values(answer.stockCells).some(function(value){return typeof value==='string' && value.trim().length>0;}));
      return question.type === 'mc' && Array.isArray(question.options) && question.options.some(function (option) {
        return option.id === answer.optionId;
      });
    }).length;
  }

  return Object.freeze({
    validateExam: validateExam,
    createAttempt: createAttempt,
    remainingSeconds: remainingSeconds,
    formatTime: formatTime,
    pauseAttempt: pauseAttempt,
    resumeAttempt: resumeAttempt,
    finishAttempt: finishAttempt,
    answeredCount: answeredCount
  });
}));
